import type { Representation } from "../types/player.types";
import { parseIsoDuration } from "../utils/playerHelpers";

export type GeneratorType = "ffmpeg" | "gpac" | "unknown";

export interface ParsedManifest {
  videoReps: Representation[];
  audioReps: Representation[];
  duration: number;
  segmentDuration: number;
  generator: GeneratorType;
  // Add live streaming fields
  isLive: boolean;
  availabilityStartTime?: Date;
  suggestedPresentationDelay?: number;
  timeShiftBufferDepth?: number;
  minimumUpdatePeriod?: number;
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
  periodDuration: number,
  isLive: boolean = false
) {
  const timescale = parseInt(segT.getAttribute("timescale") || "1", 10);
  const startNumber = parseInt(segT.getAttribute("startNumber") || "1", 10);
  const initialization = segT.getAttribute("initialization") || "";
  const media = segT.getAttribute("media") || "";
  
  // NEW: For live streaming
  const availabilityTimeOffset = parseFloat(
    segT.getAttribute("availabilityTimeOffset") || "0"
  );

  const segmentDur = parseInt(segT.getAttribute("duration") || "0", 10);
  const segmentDurationSec = segmentDur > 0 ? segmentDur / timescale : 0;

  // For live, we don't know total segments upfront
  const totalSegments = isLive 
    ? 0 // Will be calculated dynamically
    : Math.ceil(periodDuration / segmentDurationSec);

  return {
    timescale,
    startNumber,
    initialization,
    media,
    segmentDur,
    totalSegments,
    segmentDurationSec,
    availabilityTimeOffset, // NEW
    hasSegmentTimeline: false,
    segmentTimeline: [],
  };
}

export function parseManifest(mpdXml: Uint8Array): ParsedManifest {
  const mpdString = new TextDecoder().decode(mpdXml);
  const xmlDoc = new DOMParser().parseFromString(mpdString, "application/xml");

  const mpdElem = xmlDoc.querySelector("MPD");
  if (!mpdElem) {
    throw new Error("No <MPD> root element found");
  }

  // NEW: Check if live streaming
  const type = mpdElem.getAttribute("type") || "static";
  const isLive = type === "dynamic";

  // NEW: Parse live streaming attributes
  let availabilityStartTime: Date | undefined;
  let suggestedPresentationDelay: number | undefined;
  let timeShiftBufferDepth: number | undefined;
  let minimumUpdatePeriod: number | undefined;

  if (isLive) {
    const astStr = mpdElem.getAttribute("availabilityStartTime");
    if (astStr) {
      availabilityStartTime = new Date(astStr);
    }

    const spdStr = mpdElem.getAttribute("suggestedPresentationDelay");
    if (spdStr) {
      suggestedPresentationDelay = parseIsoDuration(spdStr);
    }

    const tsbdStr = mpdElem.getAttribute("timeShiftBufferDepth");
    if (tsbdStr) {
      timeShiftBufferDepth = parseIsoDuration(tsbdStr);
    }

    const mupStr = mpdElem.getAttribute("minimumUpdatePeriod");
    if (mupStr) {
      minimumUpdatePeriod = parseIsoDuration(mupStr);
    }
  }

  const generator = detectGenerator(xmlDoc);
  console.log(`Detected generator: ${generator}, isLive: ${isLive}`);

  // Get duration
  let durationAttr = mpdElem.getAttribute("mediaPresentationDuration");
  let periodDuration = 0;

  if (durationAttr) {
    periodDuration = parseIsoDuration(durationAttr);
  } else if (!isLive) {
    // For VOD, try Period duration
    const periodElem = xmlDoc.querySelector("Period");
    if (periodElem) {
      durationAttr = periodElem.getAttribute("duration") || "PT0S";
      periodDuration = parseIsoDuration(durationAttr);
    }
  }
  // For live, duration might be 0 or very large

  const periodElems = xmlDoc.querySelectorAll("Period");
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
      const hasVideoAttrs =
        contentType === "video" ||
        adaptSet.hasAttribute("width") ||
        adaptSet.hasAttribute("height");
      const hasAudioAttrs =
        contentType === "audio" ||
        adaptSet.querySelector("AudioChannelConfiguration") !== null;

      const segT = adaptSet.querySelector("SegmentTemplate");
      if (!segT) continue;

      const segmentInfo = parseSegmentTemplate(
        segT,
        generator,
        periodDuration,
        isLive
      );

      if (segmentDurationSec === 0 && segmentInfo.segmentDurationSec > 0) {
        segmentDurationSec = segmentInfo.segmentDurationSec;
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
          audioSamplingRate: parseInt(
            repElem.getAttribute("audioSamplingRate") || "0",
            10
          ),
          frameRate: repElem.getAttribute("frameRate") || "",
          initialization: segmentInfo.initialization,
          media: segmentInfo.media,
          hasSegmentTimeline: segmentInfo.hasSegmentTimeline,
          segmentTimeline: segmentInfo.segmentTimeline,
          generator,
          availabilityTimeOffset: segmentInfo.availabilityTimeOffset, // NEW
        };
      });

      if (hasVideoAttrs) {
        videoRepsArr.push(...representations);
      } else if (hasAudioAttrs) {
        audioRepsArr.push(...representations);
      }
    }
  }

  videoRepsArr.sort((a, b) => a.bandwidth - b.bandwidth);
  audioRepsArr.sort((a, b) => a.bandwidth - b.bandwidth);

  return {
    videoReps: videoRepsArr,
    audioReps: audioRepsArr,
    duration: periodDuration,
    segmentDuration: segmentDurationSec,
    generator,
    isLive,
    availabilityStartTime,
    suggestedPresentationDelay,
    timeShiftBufferDepth,
    minimumUpdatePeriod,
  };
}
