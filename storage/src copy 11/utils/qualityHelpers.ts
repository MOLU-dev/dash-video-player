// import type { Representation, BOLAState } from "../types/player.types";
// import {
//   REBUFFERING_PENALTY,
//   SWITCH_UP_MARGIN,
//   SWITCH_DOWN_MARGIN,
//   MIN_REL_DIFF_FOR_SWITCH,
// } from "../constants/player.constants";

// export function initializeBOLA(reps: Representation[]): BOLAState {
//   if (reps.length === 0) {
//     return { vp: 0, gp: 0, utilities: [] };
//   }

//   const sortedReps = [...reps].sort((a, b) => a.bandwidth - b.bandwidth);

//   const utilities = sortedReps.map((rep, index) => {
//     if (index === 0) return 0;
//     return Math.log(rep.bandwidth / sortedReps[0].bandwidth);
//   });

//   let gp = Number.MAX_VALUE;
//   for (let i = 1; i < utilities.length; i++) {
//     const diff = utilities[i] - utilities[i - 1];
//     if (diff > 0 && diff < gp) {
//       gp = diff;
//     }
//   }

//   if (gp === Number.MAX_VALUE) {
//     gp = 0.1;
//   }

//   const maxUtility = utilities[utilities.length - 1];
//   const vp = (1 + REBUFFERING_PENALTY) / (maxUtility + gp);

//   console.log(
//     `[BOLA] Initialized: vp=${vp.toFixed(4)}, gp=${gp.toFixed(
//       4
//     )}, utilities=[${utilities.map((u) => u.toFixed(2)).join(", ")}]`
//   );

//   return { vp, gp, utilities };
// }

// export function decideNextQuality(
//   videoReps: Representation[],
//   currentIdx: number,
//   bufferLevel: number,
//   effectiveThroughput: number,
//   bolaState: BOLAState,
//   targetBufferLevel: number
// ): number {
//   if (videoReps.length === 0) {
//     return currentIdx;
//   }

//   const { vp, gp, utilities } = bolaState;
//   let bestIdx = currentIdx;
//   let maxScore = -Infinity;

//   for (let i = 0; i < videoReps.length; i++) {
//     const rep = videoReps[i];
//     const utility =
//       utilities[i] ??
//       Math.log((rep.bandwidth || 1) / (videoReps[0].bandwidth || 1));
//     const score = vp * (utility + gp) - bufferLevel;

//     const requiredForUpswitch = rep.bandwidth * (1 + SWITCH_UP_MARGIN);
//     const allowedForDownswitch = rep.bandwidth * (1 - SWITCH_DOWN_MARGIN);

//     const isUpswitch = i > currentIdx;
//     const throughputOk = isUpswitch
//       ? effectiveThroughput >= requiredForUpswitch
//       : effectiveThroughput >= allowedForDownswitch;

//     if (!throughputOk) continue;

//     if (score > maxScore) {
//       maxScore = score;
//       bestIdx = i;
//     }
//   }

//   if (bestIdx !== currentIdx) {
//     const currentBw = videoReps[currentIdx].bandwidth || 1;
//     const candidateBw = videoReps[bestIdx].bandwidth || 1;
//     const rel = Math.abs(candidateBw - currentBw) / currentBw;
//     if (rel < MIN_REL_DIFF_FOR_SWITCH) {
//       return currentIdx;
//     }
//   }

//   if (bestIdx > currentIdx && bufferLevel < targetBufferLevel * 0.7) {
//     return currentIdx;
//   }

//   if (
//     bestIdx < currentIdx &&
//     bufferLevel > targetBufferLevel * 0.8 &&
//     effectiveThroughput > videoReps[currentIdx].bandwidth * 0.9
//   ) {
//     return currentIdx;
//   }

//   return bestIdx;
// }

// export function chooseInitialQualityIdx(
//   reps: Representation[],
//   effectiveThroughput: number,
//   throughputEMA: number
// ): number {
//   if (throughputEMA === 0) {
//     console.log("No bandwidth data, starting with middle quality");
//     return Math.floor(reps.length / 3);
//   }

//   for (let i = reps.length - 1; i >= 0; i--) {
//     if (reps[i].bandwidth * 1.3 <= effectiveThroughput) {
//       console.log(
//         `Starting with quality ${i} (bandwidth: ${reps[i].bandwidth})`
//       );
//       return i;
//     }
//   }

//   return 0;
// }


import type { Representation, BOLAState } from "../types/player.types";
import {
  REBUFFERING_PENALTY,
  SWITCH_UP_MARGIN,
  SWITCH_DOWN_MARGIN,
  MIN_REL_DIFF_FOR_SWITCH,
} from "../constants/player.constants";

// Logger interface for dependency injection
interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, error?: Error, data?: Record<string, unknown>): void;
}

// Configuration interface for runtime tuning
interface BOLAConfig {
  rebufferingPenalty?: number;
  switchUpMargin?: number;
  switchDownMargin?: number;
  minRelDiffForSwitch?: number;
  conservativeBufferThreshold?: number;
  aggressiveBufferThreshold?: number;
}

// Telemetry interface for metrics collection
interface ABRTelemetry {
  logQualitySwitch(from: number, to: number, reason: string): void;
  logBOLADecision(decision: {
    selectedIdx: number;
    bufferLevel: number;
    throughput: number;
    scores: number[];
  }): void;
}

// Enhanced BOLA state with cached computations
interface EnhancedBOLAState extends BOLAState {
  sortedReps: Representation[];
  minBandwidth: number;
  maxBandwidth: number;
  lastInitTime: number;
}

// Constants with defaults
const DEFAULT_CONFIG: Required<BOLAConfig> = {
  rebufferingPenalty: REBUFFERING_PENALTY,
  switchUpMargin: SWITCH_UP_MARGIN,
  switchDownMargin: SWITCH_DOWN_MARGIN,
  minRelDiffForSwitch: MIN_REL_DIFF_FOR_SWITCH,
  conservativeBufferThreshold: 0.7,
  aggressiveBufferThreshold: 0.8,
};

const EPSILON = 1e-10; // For numerical stability
const MIN_BANDWIDTH = 100000; // 100 kbps minimum
const MAX_BANDWIDTH = 100000000; // 100 Mbps maximum

/**
 * Validates and sanitizes representation data
 */
function validateRepresentations(reps: Representation[]): boolean {
  if (!Array.isArray(reps) || reps.length === 0) {
    return false;
  }

  for (const rep of reps) {
    if (!rep || typeof rep.bandwidth !== "number") {
      return false;
    }
    if (rep.bandwidth < MIN_BANDWIDTH || rep.bandwidth > MAX_BANDWIDTH) {
      return false;
    }
    if (!Number.isFinite(rep.bandwidth)) {
      return false;
    }
  }

  return true;
}

/**
 * Safely computes logarithm with bounds checking
 */
function safeLog(value: number): number {
  const clampedValue = Math.max(
    EPSILON,
    Math.min(value, Number.MAX_SAFE_INTEGER)
  );
  return Math.log(clampedValue);
}

/**
 * Initializes BOLA state with enhanced caching and validation
 */
export function initializeBOLA(
  reps: Representation[],
  config: BOLAConfig = {},
  logger?: Logger
): EnhancedBOLAState | null {
  try {
    // Validate input
    if (!validateRepresentations(reps)) {
      logger?.error(
        "Invalid representations provided to initializeBOLA",
        undefined,
        {
          repCount: reps?.length || 0,
        }
      );
      return null;
    }

    // Merge with default config
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    // Sort and cache representations (stable sort by bandwidth)
    const sortedReps = [...reps].sort((a, b) => a.bandwidth - b.bandwidth);

    // Remove duplicates by bandwidth
    const uniqueReps: Representation[] = [];
    const seenBandwidths = new Set<number>();
    for (const rep of sortedReps) {
      if (!seenBandwidths.has(rep.bandwidth)) {
        uniqueReps.push(rep);
        seenBandwidths.add(rep.bandwidth);
      }
    }

    if (uniqueReps.length === 0) {
      logger?.error("No unique representations after deduplication");
      return null;
    }

    const minBandwidth = uniqueReps[0].bandwidth;
    const maxBandwidth = uniqueReps[uniqueReps.length - 1].bandwidth;

    // Compute utilities with numerical stability
    const utilities = uniqueReps.map((rep) => {
      return safeLog(rep.bandwidth / minBandwidth);
    });

    // Compute gp (minimum utility difference)
    let gp = Number.MAX_VALUE;
    for (let i = 1; i < utilities.length; i++) {
      const diff = utilities[i] - utilities[i - 1];
      if (diff > EPSILON && diff < gp) {
        gp = diff;
      }
    }

    // Fallback for degenerate case
    if (!Number.isFinite(gp) || gp === Number.MAX_VALUE) {
      gp = 0.1;
      logger?.warn("Using fallback gp value", { gp });
    }

    const maxUtility = utilities[utilities.length - 1];
    const vp = (1 + finalConfig.rebufferingPenalty) / (maxUtility + gp);

    // Validate computed parameters
    if (!Number.isFinite(vp) || !Number.isFinite(gp)) {
      logger?.error("Invalid BOLA parameters computed", undefined, { vp, gp });
      return null;
    }

    logger?.info("BOLA initialized successfully", {
      vp: vp.toFixed(4),
      gp: gp.toFixed(4),
      representationCount: uniqueReps.length,
      bandwidthRange: `${minBandwidth}-${maxBandwidth}`,
    });

    return {
      vp,
      gp,
      utilities,
      sortedReps: uniqueReps,
      minBandwidth,
      maxBandwidth,
      lastInitTime: Date.now(),
    };
  } catch (error) {
    logger?.error("Exception in initializeBOLA", error as Error);
    return null;
  }
}

/**
 * Decides next quality level with production-grade safeguards
 */
export function decideNextQuality(
  videoReps: Representation[],
  currentIdx: number,
  bufferLevel: number,
  effectiveThroughput: number,
  bolaState: EnhancedBOLAState,
  targetBufferLevel: number,
  config: BOLAConfig = {},
  logger?: Logger,
  telemetry?: ABRTelemetry
): number {
  try {
    // Validate inputs
    if (!bolaState || !Array.isArray(videoReps) || videoReps.length === 0) {
      logger?.warn(
        "Invalid input to decideNextQuality, returning current index"
      );
      return Math.max(0, Math.min(currentIdx, videoReps.length - 1));
    }

    // Bounds check current index
    if (currentIdx < 0 || currentIdx >= videoReps.length) {
      logger?.warn("Current index out of bounds, clamping", {
        currentIdx,
        repCount: videoReps.length,
      });
      currentIdx = Math.max(0, Math.min(currentIdx, videoReps.length - 1));
    }

    // Validate numerical inputs
    if (!Number.isFinite(bufferLevel) || bufferLevel < 0) {
      bufferLevel = 0;
    }
    if (!Number.isFinite(effectiveThroughput) || effectiveThroughput < 0) {
      effectiveThroughput = 0;
    }
    if (!Number.isFinite(targetBufferLevel) || targetBufferLevel <= 0) {
      targetBufferLevel = 10; // Default 10 seconds
    }

    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const { vp, gp, utilities } = bolaState;

    let bestIdx = currentIdx;
    let maxScore = -Infinity;
    const scores: number[] = new Array(videoReps.length).fill(-Infinity);

    // Compute scores for all representations
    for (let i = 0; i < videoReps.length; i++) {
      const rep = videoReps[i];

      // Skip invalid representations
      if (!rep || typeof rep.bandwidth !== "number" || rep.bandwidth <= 0) {
        continue;
      }

      // Get or compute utility
      const utility =
        utilities[i] ?? safeLog(rep.bandwidth / bolaState.minBandwidth);

      // BOLA objective function
      const score = vp * (utility + gp) - bufferLevel;
      scores[i] = score;

      // Throughput feasibility check with margins
      const isUpswitch = i > currentIdx;
      const margin = isUpswitch
        ? finalConfig.switchUpMargin
        : -finalConfig.switchDownMargin;
      const requiredThroughput = rep.bandwidth * (1 + margin);

      if (effectiveThroughput < requiredThroughput) {
        continue;
      }

      // Update best candidate
      if (score > maxScore) {
        maxScore = score;
        bestIdx = i;
      }
    }

    // Apply hysteresis to prevent frequent switches
    if (bestIdx !== currentIdx) {
      const currentBw = videoReps[currentIdx]?.bandwidth || 1;
      const candidateBw = videoReps[bestIdx]?.bandwidth || 1;
      const relDiff = Math.abs(candidateBw - currentBw) / currentBw;

      if (relDiff < finalConfig.minRelDiffForSwitch) {
        logger?.debug(
          "Switch rejected due to insufficient quality difference",
          {
            relDiff: relDiff.toFixed(3),
            threshold: finalConfig.minRelDiffForSwitch,
          }
        );
        bestIdx = currentIdx;
      }
    }

    // Conservative upswitch policy (prevent rebuffering)
    if (bestIdx > currentIdx) {
      const conservativeThreshold =
        targetBufferLevel * finalConfig.conservativeBufferThreshold;
      if (bufferLevel < conservativeThreshold) {
        logger?.debug("Upswitch rejected due to low buffer", {
          bufferLevel: bufferLevel.toFixed(2),
          threshold: conservativeThreshold.toFixed(2),
        });
        bestIdx = currentIdx;
      }
    }

    // Prevent unnecessary downswitches when buffer is healthy
    if (bestIdx < currentIdx) {
      const aggressiveThreshold =
        targetBufferLevel * finalConfig.aggressiveBufferThreshold;
      const currentBw = videoReps[currentIdx]?.bandwidth || 1;

      if (
        bufferLevel > aggressiveThreshold &&
        effectiveThroughput > currentBw * 0.9
      ) {
        logger?.debug(
          "Downswitch rejected due to healthy buffer and throughput",
          {
            bufferLevel: bufferLevel.toFixed(2),
            throughput: effectiveThroughput.toFixed(0),
          }
        );
        bestIdx = currentIdx;
      }
    }

    // Log telemetry
    if (bestIdx !== currentIdx) {
      const reason = bestIdx > currentIdx ? "upswitch" : "downswitch";
      telemetry?.logQualitySwitch(currentIdx, bestIdx, reason);
      logger?.info(`Quality switch: ${currentIdx} → ${bestIdx}`, {
        reason,
        bufferLevel: bufferLevel.toFixed(2),
        throughput: effectiveThroughput.toFixed(0),
      });
    }

    telemetry?.logBOLADecision({
      selectedIdx: bestIdx,
      bufferLevel,
      throughput: effectiveThroughput,
      scores,
    });

    return bestIdx;
  } catch (error) {
    logger?.error("Exception in decideNextQuality", error as Error);
    return currentIdx; // Safe fallback
  }
}

/**
 * Chooses initial quality with conservative strategy
 */
export function chooseInitialQualityIdx(
  reps: Representation[],
  effectiveThroughput: number,
  throughputEMA: number,
  logger?: Logger
): number {
  try {
    // Validate inputs
    if (!validateRepresentations(reps)) {
      logger?.warn("Invalid representations, defaulting to lowest quality");
      return 0;
    }

    // No bandwidth data - start conservatively
    if (throughputEMA <= 0 || !Number.isFinite(throughputEMA)) {
      const safeIdx = Math.min(Math.floor(reps.length / 3), reps.length - 1);
      logger?.info("No bandwidth data, starting conservatively", {
        index: safeIdx,
      });
      return safeIdx;
    }

    // Use conservative multiplier for initial selection (1.5x instead of 1.3x)
    const conservativeMultiplier = 1.5;

    // Find highest quality that bandwidth can sustain
    for (let i = reps.length - 1; i >= 0; i--) {
      const requiredBandwidth = reps[i].bandwidth * conservativeMultiplier;
      if (requiredBandwidth <= effectiveThroughput) {
        logger?.info("Initial quality selected", {
          index: i,
          bandwidth: reps[i].bandwidth,
          throughput: effectiveThroughput.toFixed(0),
        });
        return i;
      }
    }

    // Fallback to lowest quality
    logger?.info("Starting with lowest quality due to low throughput");
    return 0;
  } catch (error) {
    logger?.error("Exception in chooseInitialQualityIdx", error as Error);
    return 0; // Safe fallback
  }
}

/**
 * Checks if BOLA state needs reinitialization
 */
export function shouldReinitializeBOLA(
  state: EnhancedBOLAState,
  currentReps: Representation[],
  maxAgeMs: number = 300000 // 5 minutes
): boolean {
  if (!state || !state.lastInitTime) {
    return true;
  }

  // Check age
  if (Date.now() - state.lastInitTime > maxAgeMs) {
    return true;
  }

  // Check if representations changed
  if (!state.sortedReps || state.sortedReps.length !== currentReps.length) {
    return true;
  }

  // Check bandwidth ranges
  const currentMin = Math.min(...currentReps.map((r) => r.bandwidth));
  const currentMax = Math.max(...currentReps.map((r) => r.bandwidth));

  if (
    Math.abs(currentMin - state.minBandwidth) > EPSILON ||
    Math.abs(currentMax - state.maxBandwidth) > EPSILON
  ) {
    return true;
  }

  return false;
}