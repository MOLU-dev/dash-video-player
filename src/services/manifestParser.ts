import type { Representation } from "../types/player.types";
import { parseIsoDuration } from "../utils/playerHelpers";

export type GeneratorType = "ffmpeg" | "gpac" | "unknown";

export interface ParsedManifest {
  videoReps: Representation[];
  audioReps: Representation[];
  duration: number;
  segmentDuration: number;
  generator: GeneratorType;
  isLive: boolean;
}

/**
 * Detects the generator (FFmpeg or MP4Box/GPAC) based on MPD structure
 */
function detectGenerator(xmlDoc: Document): GeneratorType {
  // Check for GPAC signature
  const programInfo = xmlDoc.querySelector("ProgramInformation");
  if (programInfo) {
    const title = programInfo.querySelector("Title")?.textContent || "";
    if (title.toLowerCase().includes("gpac")) {
      return "gpac";
    }
  }

  // Check segment template patterns
  const segmentTemplate = xmlDoc.querySelector("SegmentTemplate");
  if (segmentTemplate) {
    const media = segmentTemplate.getAttribute("media") || "";
    const initialization = segmentTemplate.getAttribute("initialization") || "";

    // FFmpeg pattern: init-stream$RepresentationID$.m4s and chunk-stream$RepresentationID$-$Number%05d$.m4s
    if (
      initialization.includes("init-stream") &&
      media.includes("chunk-stream")
    ) {
      return "ffmpeg";
    }

    // GPAC pattern: video_X_dashinit.mp4 and video_X_dash$Number$.m4s
    if (
      initialization.includes("dashinit") &&
      (media.includes("video_") || media.includes("audio_dash"))
    ) {
      return "gpac";
    }
  }

  // Check for SegmentTimeline (more common in FFmpeg)
  const segmentTimeline = xmlDoc.querySelector("SegmentTimeline");
  if (segmentTimeline && !programInfo?.textContent?.includes("GPAC")) {
    return "ffmpeg";
  }

  return "unknown";
}

/**
 * Parses segment template information based on generator type
 */
function parseSegmentTemplate(
  segT: Element,
  generator: GeneratorType,
  periodDuration: number
) {
  const timescale = parseInt(segT.getAttribute("timescale") || "1", 10);
  const startNumber = parseInt(segT.getAttribute("startNumber") || "1", 10);
  const initialization = segT.getAttribute("initialization") || "";
  const media = segT.getAttribute("media") || "";

  const segmentTimeline = segT.querySelector("SegmentTimeline");
  let segmentDur = 0;
  let totalSegments = 0;
  let segmentDurationSec = 0;

  if (segmentTimeline) {
    // Parse SegmentTimeline (common in FFmpeg)
    const sElements = Array.from(segmentTimeline.querySelectorAll("S"));
    let totalDuration = 0;

    for (const sElem of sElements) {
      const d = parseInt(sElem.getAttribute("d") || "0", 10);
      const r = parseInt(sElem.getAttribute("r") || "0", 10);
      totalSegments += r + 1;
      totalDuration += d * (r + 1);
    }

    if (totalSegments > 0) {
      segmentDur = totalDuration / totalSegments;
      segmentDurationSec = segmentDur / timescale;
    }
  } else {
    // Use duration attribute (common in GPAC and FFmpeg without SegmentTimeline)
    segmentDur = parseInt(segT.getAttribute("duration") || "0", 10);

    if (segmentDur > 0 && timescale > 0) {
      segmentDurationSec = segmentDur / timescale;
      // Calculate total segments based on period duration
      if (periodDuration !== Infinity) {
         totalSegments = Math.ceil(periodDuration / segmentDurationSec);
      } else {
        totalSegments = 0; // Unknown
      }
    } else {
      console.warn("No valid segment duration found in SegmentTemplate");
    }
  }

  const totalDurationSec = (segmentDur * totalSegments) / timescale;

  return {
    timescale,
    startNumber,
    initialization,
    media,
    segmentDur,
    totalSegments,
    segmentDurationSec,
    hasSegmentTimeline: !!segmentTimeline,
    segmentTimeline: segmentTimeline
      ? Array.from(segmentTimeline.querySelectorAll("S")).map((s) => ({
          t: parseInt(s.getAttribute("t") || "0", 10),
          d: parseInt(s.getAttribute("d") || "0", 10),
          r: parseInt(s.getAttribute("r") || "0", 10),
        }))
      : [],
     totalDurationSec,
  };
}

export function parseManifest(mpdXml: Uint8Array): ParsedManifest {
  const mpdString = new TextDecoder().decode(mpdXml);
  const xmlDoc = new DOMParser().parseFromString(mpdString, "application/xml");

  console.log("MPD content:", mpdString);

  // Detect generator type
  const generator = detectGenerator(xmlDoc);
  console.log(`Detected generator: ${generator}`);

  const mpdElem = xmlDoc.querySelector("MPD");
  if (!mpdElem) {
    throw new Error("No <MPD> root element found");
  }

  const isLive = mpdElem.getAttribute("type") === "dynamic";
  console.log(`Stream type: ${isLive ? "live" : "vod"}`);

  // Get duration - prioritize mediaPresentationDuration from MPD root
  let durationAttr = mpdElem.getAttribute("mediaPresentationDuration");
  let periodDuration = 0;

  if (isLive) {
    if (durationAttr) {
      periodDuration = parseIsoDuration(durationAttr);
      console.log(`Live stream with finite duration: ${durationAttr} (${periodDuration}s)`);
    } else {
      periodDuration = Infinity;
      console.log("Live stream detected: setting duration to Infinity");
    }
  } else if (durationAttr) {
    // Use MPD-level duration as primary source
    periodDuration = parseIsoDuration(durationAttr);
    console.log(
      `Using mediaPresentationDuration: ${durationAttr} (${periodDuration}s)`
    );
  } else {
    // Fallback to Period duration
    const periodElem = xmlDoc.querySelector("Period");
    if (!periodElem) {
      throw new Error("No <Period> found in MPD");
    }
    durationAttr = periodElem.getAttribute("duration") || "PT0S";
    periodDuration = parseIsoDuration(durationAttr);
    console.log(
      `Using Period duration as fallback: ${durationAttr} (${periodDuration}s)`
    );
  }

  if (!isLive && periodDuration <= 0) {
    console.error("Invalid period duration:", periodDuration);
    throw new Error("Invalid or missing duration in MPD");
  }

  const periodElems = Array.from(xmlDoc.querySelectorAll("Period"));
  if (periodElems.length === 0) {
    throw new Error("No <Period> elements found in MPD");
  }

  const videoRepsArr: Representation[] = [];
  const audioRepsArr: Representation[] = [];
  let segmentDurationSec = 0;

  for (const periodElem of periodElems) {
    const adaptationSets = Array.from(
      periodElem.querySelectorAll("AdaptationSet")
    );

    for (const adaptSet of adaptationSets) {
      const contentType = adaptSet.getAttribute("contentType");
      const mimeTypeAttr = adaptSet.getAttribute("mimeType") || "";
      const hasVideoAttrs =
        contentType === "video" ||
        mimeTypeAttr.startsWith("video/") ||
        adaptSet.hasAttribute("width") ||
        adaptSet.hasAttribute("height") ||
        adaptSet.querySelector("Representation[width]") !== null ||
        adaptSet.querySelector("Representation[height]") !== null;

      const hasAudioAttrs =
        contentType === "audio" ||
        mimeTypeAttr.startsWith("audio/") ||
        adaptSet.querySelector("AudioChannelConfiguration") !== null ||
        adaptSet.querySelector("Representation[audioSamplingRate]") !== null;

      if (!hasVideoAttrs && !hasAudioAttrs) {
        console.warn("Skipping AdaptationSet: could not determine content type", {
          id: adaptSet.getAttribute("id"),
          contentType,
          mimeType: mimeTypeAttr
        });
        continue;
      }

      console.log(`[Manifest] AdaptationSet found:`, {
        id: adaptSet.getAttribute("id"),
        hasVideoAttrs,
        hasAudioAttrs,
        mimeType: mimeTypeAttr,
        contentType
      });

      const segT = adaptSet.querySelector("SegmentTemplate");
      if (!segT) {
        console.error("No <SegmentTemplate> under AdaptationSet");
        continue;
      }

      const segmentInfo = parseSegmentTemplate(segT, generator, periodDuration);

      // Store the first valid segment duration we find
      if (segmentDurationSec === 0 && segmentInfo.segmentDurationSec > 0) {
        segmentDurationSec = segmentInfo.segmentDurationSec;
        console.log(`Segment duration: ${segmentDurationSec}s`);
      }

      // If live and no explicit duration, use calculated duration from segments
      if (isLive && periodDuration === Infinity && segmentInfo.totalDurationSec > 0) {
         // Use the max duration found so far across AdaptationSets
          // (assuming they start similarly)
         // But we only set it if not set, or we can update it.
         // Since we parse all AdaptationSets, let's keep track of max found.
      }

      const representations = Array.from(
        adaptSet.querySelectorAll("Representation")
      ).map((repElem) => {
        const id = repElem.getAttribute("id") || "";
        const codecs = repElem.getAttribute("codecs") || "";

        let mimeType =
          repElem.getAttribute("mimeType") ||
          adaptSet.getAttribute("mimeType") ||
          "";

        if (!mimeType) {
          if (hasVideoAttrs) mimeType = "video/mp4";
          else if (hasAudioAttrs) mimeType = "audio/mp4";
        }

        if (codecs) {
          mimeType = `${mimeType.split(";")[0]}; codecs="${codecs}"`;
        }

        const bandwidth = parseInt(
          repElem.getAttribute("bandwidth") || "0",
          10
        );
        const width = parseInt(repElem.getAttribute("width") || "0", 10);
        const height = parseInt(repElem.getAttribute("height") || "0", 10);
        const audioSamplingRate = parseInt(
          repElem.getAttribute("audioSamplingRate") || "0",
          10
        );
        const frameRate = repElem.getAttribute("frameRate") || "";

        return {
          id,
          mimeType,
          segmentDur: segmentInfo.segmentDur,
          bandwidth,
          timescale: segmentInfo.timescale,
          startNumber: segmentInfo.startNumber,
          totalSegments: segmentInfo.totalSegments,
          width,
          height,
          audioSamplingRate,
          frameRate,
          initialization: segmentInfo.initialization,
          media: segmentInfo.media,
          hasSegmentTimeline: segmentInfo.hasSegmentTimeline,
          segmentTimeline: segmentInfo.segmentTimeline,
          generator,
        };
      });

      if (hasVideoAttrs) {
        videoRepsArr.push(...representations);
      } else if (hasAudioAttrs) {
        audioRepsArr.push(...representations);
      }
    }
  }

  // Final check for live duration
  if (isLive && periodDuration === Infinity) {
      // Find the max calculated duration from parsed video reps
      let maxDuration = 0;
      for (const rep of videoRepsArr) {
        if (rep.totalSegments && rep.segmentDur && rep.timescale) {
          // Calculate absolute duration based on startNumber + totalSegments
          // This assumes startNumber is relative to stream start (period start)
          const totalSegmentsCount = (rep.startNumber || 1) + rep.totalSegments - 1;
          const dur = (totalSegmentsCount * rep.segmentDur) / rep.timescale;
          if (dur > maxDuration) maxDuration = dur;
        }
      }
      
      if (maxDuration > 0) {
        periodDuration = maxDuration;
        console.log(`[Live] Calculated duration from segments: ${periodDuration}s`);
      }
  }

  videoRepsArr.sort((a, b) => a.bandwidth - b.bandwidth);
  audioRepsArr.sort((a, b) => a.bandwidth - b.bandwidth);

  console.log("Parsed representations:", {
    videoCount: videoRepsArr.length,
    audioCount: audioRepsArr.length,
    duration: periodDuration,
    segmentDuration: segmentDurationSec,
    totalSegments: videoRepsArr[0]?.totalSegments,
  });

  return {
    videoReps: videoRepsArr,
    audioReps: audioRepsArr,
    duration: periodDuration,
    segmentDuration: segmentDurationSec,
    generator,
    isLive,
  };
}
