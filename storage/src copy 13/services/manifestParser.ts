//src/services/manifestParser.ts
import type { Representation } from "../types/player.types";
import { parseIsoDuration } from "../utils/playerHelpers";

export interface ParsedManifest {
  videoReps: Representation[];
  audioReps: Representation[];
  duration: number;
  segmentDuration: number;
}

export function parseManifest(mpdXml: Uint8Array): ParsedManifest {
  const mpdString = new TextDecoder().decode(mpdXml);
  const xmlDoc = new DOMParser().parseFromString(mpdString, "application/xml");

  console.log("MPD content:", mpdString);

  // Get duration from MPD root element
  const mpdElem = xmlDoc.querySelector("MPD");
  if (!mpdElem) {
    throw new Error("No <MPD> root element found");
  }

  // Get duration from mediaPresentationDuration attribute
  let durationAttr = mpdElem.getAttribute("mediaPresentationDuration");

  // If not found, fall back to Period duration
  if (!durationAttr) {
    const periodElem = xmlDoc.querySelector("Period");
    if (!periodElem) {
      throw new Error("No <Period> found in MPD");
    }
    durationAttr = periodElem.getAttribute("duration") || "PT0S";
  }

  const periodDuration = parseIsoDuration(durationAttr);

  // Get all Period elements
  const periodElems = xmlDoc.querySelectorAll("Period");
  if (periodElems.length === 0) {
    throw new Error("No <Period> elements found in MPD");
  }

  const videoRepsArr: Representation[] = [];
  const audioRepsArr: Representation[] = [];
  let segmentDurationSec = 0;

  // Process each Period element
  for (const periodElem of periodElems) {
    const adaptationSets = Array.from(
      periodElem.querySelectorAll("AdaptationSet")
    );

    for (const adaptSet of adaptationSets) {
      // Try to determine type by contentType attribute first
      const contentType = adaptSet.getAttribute("contentType");

      // Fall back to checking for video/audio attributes
      const hasVideoAttrs =
        contentType === "video" ||
        adaptSet.hasAttribute("width") ||
        adaptSet.hasAttribute("height") ||
        adaptSet.hasAttribute("maxWidth") ||
        adaptSet.hasAttribute("maxHeight");

      const hasAudioAttrs =
        contentType === "audio" ||
        adaptSet.querySelector("AudioChannelConfiguration") !== null;

      const segT = adaptSet.querySelector("SegmentTemplate");
      if (!segT) {
        console.error("No <SegmentTemplate> under AdaptationSet");
        continue;
      }

      const timescale = parseInt(segT.getAttribute("timescale") || "1", 10);
      const startNumber = parseInt(segT.getAttribute("startNumber") || "1", 10);
      const initialization = segT.getAttribute("initialization") || "";
      const media = segT.getAttribute("media") || "";

      // Check if we have a SegmentTimeline
      const segmentTimeline = segT.querySelector("SegmentTimeline");
      let segmentDur = 0;
      let totalSegments = 0;

      if (segmentTimeline) {
        // Parse SegmentTimeline with S elements
        const sElements = Array.from(segmentTimeline.querySelectorAll("S"));
        let totalDuration = 0;

        for (const sElem of sElements) {
          const d = parseInt(sElem.getAttribute("d") || "0", 10);
          const r = parseInt(sElem.getAttribute("r") || "0", 10);
          // r is repeat count, so total segments for this S element is r + 1
          totalSegments += r + 1;
          totalDuration += d * (r + 1);
        }

        // Calculate average segment duration
        if (totalSegments > 0) {
          segmentDur = totalDuration / totalSegments;
          segmentDurationSec = segmentDur / timescale;
        }
      } else {
        // Fall back to duration attribute
        segmentDur = parseInt(segT.getAttribute("duration") || "0", 10);
        segmentDurationSec = segmentDur / timescale;
        totalSegments = Math.ceil(periodDuration / segmentDurationSec);
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
          segmentDur,
          bandwidth,
          timescale,
          startNumber,
          totalSegments,
          width,
          height,
          audioSamplingRate,
          frameRate,
          initialization,
          media,
          // Additional properties for segment timeline support
          hasSegmentTimeline: !!segmentTimeline,
          segmentTimeline: segmentTimeline
            ? Array.from(segmentTimeline.querySelectorAll("S")).map((s) => ({
                t: parseInt(s.getAttribute("t") || "0", 10),
                d: parseInt(s.getAttribute("d") || "0", 10),
                r: parseInt(s.getAttribute("r") || "0", 10),
              }))
            : [],
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
  };
}
