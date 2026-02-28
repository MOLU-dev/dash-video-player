import type { Representation, BOLAState } from "../types/player.types";
import {
  REBUFFERING_PENALTY,
  SWITCH_UP_MARGIN,
  SWITCH_DOWN_MARGIN,
  MIN_REL_DIFF_FOR_SWITCH,
} from "../constants/player.constants";

export function initializeBOLA(reps: Representation[]): BOLAState {
  if (reps.length === 0) {
    return { vp: 0, gp: 0, utilities: [] };
  }

  const sortedReps = [...reps].sort((a, b) => a.bandwidth - b.bandwidth);

  const utilities = sortedReps.map((rep, index) => {
    if (index === 0) return 0;
    return Math.log(rep.bandwidth / sortedReps[0].bandwidth);
  });

  let gp = Number.MAX_VALUE;
  for (let i = 1; i < utilities.length; i++) {
    const diff = utilities[i] - utilities[i - 1];
    if (diff > 0 && diff < gp) {
      gp = diff;
    }
  }

  if (gp === Number.MAX_VALUE) {
    gp = 0.1;
  }

  const maxUtility = utilities[utilities.length - 1];
  const vp = (1 + REBUFFERING_PENALTY) / (maxUtility + gp);

  console.log(
    `[BOLA] Initialized: vp=${vp.toFixed(4)}, gp=${gp.toFixed(
      4
    )}, utilities=[${utilities.map((u) => u.toFixed(2)).join(", ")}]`
  );

  return { vp, gp, utilities };
}

export function decideNextQuality(
  videoReps: Representation[],
  currentIdx: number,
  bufferLevel: number,
  effectiveThroughput: number,
  bolaState: BOLAState,
  targetBufferLevel: number
): number {
  if (videoReps.length === 0) {
    return currentIdx;
  }

  const { vp, gp, utilities } = bolaState;
  let bestIdx = currentIdx;
  let maxScore = -Infinity;

  for (let i = 0; i < videoReps.length; i++) {
    const rep = videoReps[i];
    const utility =
      utilities[i] ??
      Math.log((rep.bandwidth || 1) / (videoReps[0].bandwidth || 1));
    const score = vp * (utility + gp) - bufferLevel;

    const requiredForUpswitch = rep.bandwidth * (1 + SWITCH_UP_MARGIN);
    const allowedForDownswitch = rep.bandwidth * (1 - SWITCH_DOWN_MARGIN);

    const isUpswitch = i > currentIdx;
    const throughputOk = isUpswitch
      ? effectiveThroughput >= requiredForUpswitch
      : effectiveThroughput >= allowedForDownswitch;

    if (!throughputOk) continue;

    if (score > maxScore) {
      maxScore = score;
      bestIdx = i;
    }
  }

  if (bestIdx !== currentIdx) {
    const currentBw = videoReps[currentIdx].bandwidth || 1;
    const candidateBw = videoReps[bestIdx].bandwidth || 1;
    const rel = Math.abs(candidateBw - currentBw) / currentBw;
    if (rel < MIN_REL_DIFF_FOR_SWITCH) {
      return currentIdx;
    }
  }

  if (bestIdx > currentIdx && bufferLevel < targetBufferLevel * 0.7) {
    return currentIdx;
  }

  if (
    bestIdx < currentIdx &&
    bufferLevel > targetBufferLevel * 0.8 &&
    effectiveThroughput > videoReps[currentIdx].bandwidth * 0.9
  ) {
    return currentIdx;
  }

  return bestIdx;
}

export function chooseInitialQualityIdx(
  reps: Representation[],
  effectiveThroughput: number,
  throughputEMA: number
): number {
  if (throughputEMA === 0) {
    console.log("No bandwidth data, starting with middle quality");
    return Math.floor(reps.length / 3);
  }

  for (let i = reps.length - 1; i >= 0; i--) {
    if (reps[i].bandwidth * 1.3 <= effectiveThroughput) {
      console.log(
        `Starting with quality ${i} (bandwidth: ${reps[i].bandwidth})`
      );
      return i;
    }
  }

  return 0;
}
