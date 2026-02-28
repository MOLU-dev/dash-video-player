// src/services/manifestParser.ts - 
import type { Representation } from "../types/player.types";
import { parseIsoDuration } from "../utils/playerHelpers";

export interface ParsedManifest {
  videoReps: Representation[];
  audioReps: Representation[];
  duration: number;
  segmentDuration: number;
  isLive: boolean;
  isEndedLive: boolean; // NEW: Indicates stream has ended but uses live structure
  minimumUpdatePeriod?: number;
  availabilityStartTime?: Date;
  timeShiftBufferDepth?: number;
  publishTime?: Date;
}

interface SegmentTimelineEntry {
  t: number; // start time in timescale units
  d: number; // duration in timescale units
  r?: number; // repeat count (default 0)
}

/**
 * Calculate total segments and duration from SegmentTimeline
 */
function parseSegmentTimeline(
  segmentTimeline: Element,
  timescale: number
): {
  totalSegments: number;
  totalDuration: number;
  firstSegmentTime: number;
  lastSegmentTime: number;
} {
  const sElements = Array.from(segmentTimeline.querySelectorAll("S"));
  const entries: SegmentTimelineEntry[] = [];

  for (const s of sElements) {
    const t = parseInt(s.getAttribute("t") || "0", 10);
    const d = parseInt(s.getAttribute("d") || "0", 10);
    const r = parseInt(s.getAttribute("r") || "0", 10);

    entries.push({ t, d, r });
  }

  if (entries.length === 0) {
    return {
      totalSegments: 0,
      totalDuration: 0,
      firstSegmentTime: 0,
      lastSegmentTime: 0,
    };
  }

  let totalSegments = 0;
  let currentTime = entries[0].t || 0;
  const firstSegmentTime = currentTime;

  for (const entry of entries) {
    if (entry.t > 0 && entry.t !== currentTime) {
      // Explicit time jump
      currentTime = entry.t;
    }

    const repeatCount = (entry.r || 0) + 1; // r=0 means 1 segment, r=3 means 4 segments
    totalSegments += repeatCount;
    currentTime += entry.d * repeatCount;
  }

  const lastSegmentTime = currentTime;
  const totalDuration = (lastSegmentTime - firstSegmentTime) / timescale;

  return { totalSegments, totalDuration, firstSegmentTime, lastSegmentTime };
}

export function parseManifest(mpdXml: Uint8Array): ParsedManifest {
  const mpdString = new TextDecoder().decode(mpdXml);
  const xmlDoc = new DOMParser().parseFromString(mpdString, "application/xml");

  const mpdRoot = xmlDoc.querySelector("MPD");
  if (!mpdRoot) {
    throw new Error("Invalid MPD: No <MPD> root element");
  }

  // Determine stream type
  const type = mpdRoot.getAttribute("type") || "static";
  const isLive = type === "dynamic";

  // Check if this is an ended live stream (static but with SegmentTimeline)
  const hasSegmentTimeline = xmlDoc.querySelector("SegmentTimeline") !== null;
  const isEndedLive = type === "static" && hasSegmentTimeline;

  console.log("📺 Stream Type:", {
    type,
    isLive,
    isEndedLive,
    hasSegmentTimeline,
  });

  // Parse live-specific attributes
  let minimumUpdatePeriod: number | undefined;
  let availabilityStartTime: Date | undefined;
  let timeShiftBufferDepth: number | undefined;
  let publishTime: Date | undefined;

  if (isLive) {
    const updatePeriod = mpdRoot.getAttribute("minimumUpdatePeriod");
    if (updatePeriod) {
      minimumUpdatePeriod = parseIsoDuration(updatePeriod);
    }

    const astStr = mpdRoot.getAttribute("availabilityStartTime");
    if (astStr) {
      availabilityStartTime = new Date(astStr);
    }

    const tsbdStr = mpdRoot.getAttribute("timeShiftBufferDepth");
    if (tsbdStr) {
      timeShiftBufferDepth = parseIsoDuration(tsbdStr);
    }

    const publishTimeStr = mpdRoot.getAttribute("publishTime");
    if (publishTimeStr) {
      publishTime = new Date(publishTimeStr);
    }
  }

  const periodElem = xmlDoc.querySelector("Period");
  if (!periodElem) {
    throw new Error("No <Period> found in MPD");
  }

  // Get duration from MPD or Period
  let periodDuration = 0;
  const mpdDuration = mpdRoot.getAttribute("mediaPresentationDuration");
  if (mpdDuration) {
    periodDuration = parseIsoDuration(mpdDuration);
  } else {
    const periodDurationAttr = periodElem.getAttribute("duration");
    if (periodDurationAttr) {
      periodDuration = parseIsoDuration(periodDurationAttr);
    }
  }

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

    const timescale = parseInt(segT.getAttribute("timescale") || "1", 10);
    const startNumber = parseInt(segT.getAttribute("startNumber") || "1", 10);
    const duration = parseInt(segT.getAttribute("duration") || "0", 10);

    let totalSegments = 0;
    let calculatedDuration = 0;

    // Check for SegmentTimeline (used in live and ended-live streams)
    const segmentTimeline = segT.querySelector("SegmentTimeline");

    if (segmentTimeline) {
      const timelineData = parseSegmentTimeline(segmentTimeline, timescale);
      totalSegments = timelineData.totalSegments;
      calculatedDuration = timelineData.totalDuration;

      console.log("📊 Timeline Data:", {
        totalSegments,
        duration: calculatedDuration,
        startNumber,
      });
    } else if (duration > 0) {
      // Standard VOD with fixed duration
      segmentDurationSec = duration / timescale;
      if (periodDuration > 0) {
        totalSegments = Math.ceil(periodDuration / segmentDurationSec);
      }
    }

    // Use calculated duration if available, otherwise use period duration
    if (calculatedDuration > 0 && periodDuration === 0) {
      periodDuration = calculatedDuration;
    }

    // Use first segment's duration as representative
    if (duration > 0) {
      segmentDurationSec = duration / timescale;
    }

    // For live streams without known end, use a large number
    if (isLive && totalSegments === 0) {
      totalSegments = 999999;
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

      const bandwidth = parseInt(repElem.getAttribute("bandwidth") || "0", 10);
      const width = parseInt(repElem.getAttribute("width") || "0", 10);
      const height = parseInt(repElem.getAttribute("height") || "0", 10);

      // Check for representation-level SegmentTemplate
      const repSegT = repElem.querySelector("SegmentTemplate");
      let repStartNumber = startNumber;
      let repTotalSegments = totalSegments;
      let repTimeline: SegmentTimelineEntry[] | undefined;

      if (repSegT) {
        repStartNumber = parseInt(
          repSegT.getAttribute("startNumber") || startNumber.toString(),
          10
        );

        const repSegTimeline = repSegT.querySelector("SegmentTimeline");
        if (repSegTimeline) {
          const timelineData = parseSegmentTimeline(repSegTimeline, timescale);
          repTotalSegments = timelineData.totalSegments;

          // Store timeline for reference
          const sElements = Array.from(repSegTimeline.querySelectorAll("S"));
          repTimeline = sElements.map((s) => ({
            t: parseInt(s.getAttribute("t") || "0", 10),
            d: parseInt(s.getAttribute("d") || "0", 10),
            r: parseInt(s.getAttribute("r") || "0", 10),
          }));
        }
      }

      return {
        id,
        mimeType,
        segmentDur: duration,
        bandwidth,
        timescale,
        startNumber: repStartNumber,
        totalSegments: repTotalSegments,
        width,
        height,
        segmentTimeline: repTimeline,
      };
    });

    if (hasVideoAttrs) {
      videoRepsArr.push(...representations);
    } else if (hasAudioAttrs) {
      audioRepsArr.push(...representations);
    }
  }

  videoRepsArr.sort((a, b) => a.bandwidth - b.bandwidth);

  console.log("✅ Parsed Manifest:", {
    isLive,
    isEndedLive,
    duration: periodDuration,
    videoReps: videoRepsArr.length,
    audioReps: audioRepsArr.length,
    firstVideoStartNumber: videoRepsArr[0]?.startNumber,
    firstVideoTotalSegments: videoRepsArr[0]?.totalSegments,
  });

  return {
    videoReps: videoRepsArr,
    audioReps: audioRepsArr,
    duration: periodDuration,
    segmentDuration: segmentDurationSec,
    isLive,
    isEndedLive,
    minimumUpdatePeriod,
    availabilityStartTime,
    timeShiftBufferDepth,
    publishTime,
  };
}
