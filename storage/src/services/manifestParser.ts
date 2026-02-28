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

  const periodElem = xmlDoc.querySelector("Period");
  if (!periodElem) {
    throw new Error("No <Period> found in MPD");
  }

  const periodDuration = parseIsoDuration(
    periodElem.getAttribute("duration") || "PT0S"
  );
  const adaptationSets = Array.from(
    periodElem.querySelectorAll("AdaptationSet")
  );

  const videoRepsArr: Representation[] = [];
  const audioRepsArr: Representation[] = [];
  let segmentDurationSec = 0;

  for (const adaptSet of adaptationSets) {
    const hasVideoAttrs =
      adaptSet.hasAttribute("width") ||
      adaptSet.hasAttribute("height") ||
      adaptSet.hasAttribute("maxWidth") ||
      adaptSet.hasAttribute("maxHeight");

    const hasAudioAttrs =
      adaptSet.querySelector("AudioChannelConfiguration") !== null;

    const segT = adaptSet.querySelector("SegmentTemplate");
    if (!segT) {
      console.error("No <SegmentTemplate> under AdaptationSet");
      continue;
    }

    const duration = parseInt(segT.getAttribute("duration") || "0", 10);
    const timescale = parseInt(segT.getAttribute("timescale") || "1", 10);
    const startNumber = parseInt(segT.getAttribute("startNumber") || "1", 10);
    segmentDurationSec = duration / timescale;
    const totalSegments = Math.ceil(periodDuration / segmentDurationSec);

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

      const bandwidth = parseInt(repElem.getAttribute("bandwidth") || "0", 10);
      const width = parseInt(repElem.getAttribute("width") || "0", 10);
      const height = parseInt(repElem.getAttribute("height") || "0", 10);

      return {
        id,
        mimeType,
        segmentDur: duration,
        bandwidth,
        timescale,
        startNumber,
        totalSegments,
        width,
        height,
      };
    });

    if (hasVideoAttrs) {
      videoRepsArr.push(...representations);
    } else if (hasAudioAttrs) {
      audioRepsArr.push(...representations);
    }
  }

  videoRepsArr.sort((a, b) => a.bandwidth - b.bandwidth);

  return {
    videoReps: videoRepsArr,
    audioReps: audioRepsArr,
    duration: periodDuration,
    segmentDuration: segmentDurationSec,
  };
}
