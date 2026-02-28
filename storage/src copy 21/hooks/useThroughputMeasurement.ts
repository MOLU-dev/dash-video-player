// import { useRef, useCallback } from 'react';
// import type { ThroughputSample, MediaType } from '../types/player.types';
// import {
//   THROUGHPUT_WINDOW_SIZE,
//   MIN_SEGMENT_SIZE_FOR_MEASUREMENT,
//   MAX_THROUGHPUT_SAMPLE_AGE,
// } from '../constants/player.constants';

// export function useThroughputMeasurement() {
//   const throughputEMARef = useRef(0);
//   const throughputSamplesRef = useRef<ThroughputSample[]>([]);
//   const videoThroughputSamplesRef = useRef<ThroughputSample[]>([]);
//   const audioThroughputSamplesRef = useRef<ThroughputSample[]>([]);

//   const cleanupOldSamples = useCallback((samples: ThroughputSample[]) => {
//     const now = Date.now();
//     const cutoffTime = now - MAX_THROUGHPUT_SAMPLE_AGE;
//     return samples.filter((sample) => sample.timestamp > cutoffTime);
//   }, []);

//   const calculateWeightedThroughput = useCallback((): number => {
//     const samples = throughputSamplesRef.current;
//     if (samples.length === 0) return throughputEMARef.current || 0;

//     if (samples.length < 3) {
//       const sum = samples.reduce((acc, sample) => acc + sample.throughput, 0);
//       return sum / samples.length;
//     }

//     const now = Date.now();
//     let totalWeight = 0;
//     let weightedSum = 0;

//     samples.forEach((sample) => {
//       const age = now - sample.timestamp;
//       const recencyWeight = Math.max(0, 1 - age / MAX_THROUGHPUT_SAMPLE_AGE);
//       const sizeWeight = Math.min(1, sample.bytes / 500000);
//       const weight = recencyWeight * sizeWeight;

//       weightedSum += sample.throughput * weight;
//       totalWeight += weight;
//     });

//     if (samples.length >= 5) {
//       const simpleWeighted = totalWeight > 0 ? weightedSum / totalWeight : 0;
//       const percentileBased = calculatePercentileThroughput();
//       return percentileBased * 0.7 + simpleWeighted * 0.3;
//     }

//     return totalWeight > 0 ? weightedSum / totalWeight : samples[0].throughput;
//   }, []);

//   const calculatePercentileThroughput = useCallback((): number => {
//     const samples = throughputSamplesRef.current;
//     if (samples.length === 0) return 0;

//     const throughputs = samples.map((s) => s.throughput).sort((a, b) => a - b);
//     const lowerIdx = Math.floor(throughputs.length * 0.25);
//     const upperIdx = Math.floor(throughputs.length * 0.75);

//     const filteredThroughputs = throughputs.slice(lowerIdx, upperIdx + 1);
//     return (
//       filteredThroughputs.reduce((a, b) => a + b, 0) /
//       filteredThroughputs.length
//     );
//   }, []);

//   const getVideoThroughput = useCallback((): number => {
//     const samples = videoThroughputSamplesRef.current;
//     if (samples.length === 0) return throughputEMARef.current;

//     const throughputs = samples.map((s) => s.throughput).sort((a, b) => a - b);
//     const medianIndex = Math.floor(throughputs.length / 2);
//     return throughputs[medianIndex];
//   }, []);

//   const updateThroughputMeasurement = useCallback(
//     (bytes: number, durationMs: number, mediaType: MediaType) => {
//       if (bytes < MIN_SEGMENT_SIZE_FOR_MEASUREMENT || durationMs < 10) {
//         console.log(
//           `Skipping throughput measurement: bytes=${bytes}, duration=${durationMs}ms`
//         );
//         return;
//       }

//       const now = Date.now();
//       const bits = bytes * 8;
//       const throughput = bits / (durationMs / 1000);

//       const sample: ThroughputSample = {
//         timestamp: now,
//         throughput,
//         bytes,
//         duration: durationMs,
//         mediaType,
//         segmentSize: bytes,
//       };

//       throughputSamplesRef.current.push(sample);

//       if (mediaType === "video") {
//         videoThroughputSamplesRef.current.push(sample);
//       } else {
//         audioThroughputSamplesRef.current.push(sample);
//       }

//       throughputSamplesRef.current = cleanupOldSamples(
//         throughputSamplesRef.current
//       );
//       videoThroughputSamplesRef.current = cleanupOldSamples(
//         videoThroughputSamplesRef.current
//       );
//       audioThroughputSamplesRef.current = cleanupOldSamples(
//         audioThroughputSamplesRef.current
//       );

//       if (throughputSamplesRef.current.length > THROUGHPUT_WINDOW_SIZE * 2) {
//         throughputSamplesRef.current = throughputSamplesRef.current.slice(
//           -THROUGHPUT_WINDOW_SIZE
//         );
//       }
//       if (videoThroughputSamplesRef.current.length > THROUGHPUT_WINDOW_SIZE) {
//         videoThroughputSamplesRef.current =
//           videoThroughputSamplesRef.current.slice(-THROUGHPUT_WINDOW_SIZE);
//       }
//       if (audioThroughputSamplesRef.current.length > THROUGHPUT_WINDOW_SIZE) {
//         audioThroughputSamplesRef.current =
//           audioThroughputSamplesRef.current.slice(-THROUGHPUT_WINDOW_SIZE);
//       }

//       const effectiveThroughput = calculateWeightedThroughput();

//       const alpha = 0.3;
//       throughputEMARef.current = throughputEMARef.current
//         ? alpha * effectiveThroughput + (1 - alpha) * throughputEMARef.current
//         : effectiveThroughput;

//       console.log(
//         `Throughput update: ${Math.round(
//           throughput / 1000
//         )}kbps (raw) -> ${Math.round(
//           effectiveThroughput / 1000
//         )}kbps (weighted) [${mediaType}]`
//       );
//     },
//     [cleanupOldSamples, calculateWeightedThroughput]
//   );

//   return {
//     throughputEMARef,
//     updateThroughputMeasurement,
//     getVideoThroughput,
//     calculateWeightedThroughput,
//   };
// }

// hooks/useThroughputMeasurement.ts
import { useRef, useCallback } from "react";
import type { MediaType, ThroughputSample } from "../types/player.types";
import {
  THROUGHPUT_WINDOW_SIZE,
  MIN_SEGMENT_SIZE_FOR_MEASUREMENT,
  MAX_THROUGHPUT_SAMPLE_AGE,
} from "../constants/player.constants";

const MIN_THROUGHPUT = 10 * 1000; // 10 kbps (bps)
const MAX_THROUGHPUT = 1_000 * 1000 * 1000; // 1 Gbps (bps)
const CONSERVATIVE_PERCENTILE = 0.25; // 25th percentile for ABR

export function useThroughputMeasurement({
  // optional config override
  halfLifeMs = 8000, // half-life for decay (ms). 8s default — tune to taste.
  decayBaseline = MIN_THROUGHPUT, // value EMA decays *toward*
}: { halfLifeMs?: number; decayBaseline?: number } = {}) {
  const throughputEMARef = useRef<number>(0);
  const throughputSamplesRef = useRef<ThroughputSample[]>([]);
  const videoThroughputSamplesRef = useRef<ThroughputSample[]>([]);
  const audioThroughputSamplesRef = useRef<ThroughputSample[]>([]);
  const lastSampleTimeRef = useRef<number | null>(null); // track last measured sample time

  // ---------------------
  // Helpers (unchanged)
  // ---------------------
  const saveSample = useCallback((sample: ThroughputSample) => {
    throughputSamplesRef.current.push(sample);
    if (sample.mediaType === "video") {
      videoThroughputSamplesRef.current.push(sample);
    } else {
      audioThroughputSamplesRef.current.push(sample);
    }

    // Trim buffers to window sizes
    if (throughputSamplesRef.current.length > THROUGHPUT_WINDOW_SIZE * 3) {
      throughputSamplesRef.current = throughputSamplesRef.current.slice(
        -THROUGHPUT_WINDOW_SIZE
      );
    }
    if (videoThroughputSamplesRef.current.length > THROUGHPUT_WINDOW_SIZE) {
      videoThroughputSamplesRef.current = videoThroughputSamplesRef.current.slice(
        -THROUGHPUT_WINDOW_SIZE
      );
    }
    if (audioThroughputSamplesRef.current.length > THROUGHPUT_WINDOW_SIZE) {
      audioThroughputSamplesRef.current = audioThroughputSamplesRef.current.slice(
        -THROUGHPUT_WINDOW_SIZE
      );
    }

    // update last-sample time
    lastSampleTimeRef.current = sample.timestamp;
  }, []);

  const cleanupOldSamples = useCallback((samples: ThroughputSample[]) => {
    const now = Date.now();
    const cutoffTime = now - MAX_THROUGHPUT_SAMPLE_AGE;
    return samples.filter((sample) => sample.timestamp > cutoffTime);
  }, []);

  const filterOutliersIQR = useCallback((arr: number[]) => {
    if (arr.length < 4) return arr.slice();
    const sorted = arr.slice().sort((a, b) => a - b);
    const q1 = sorted[Math.floor((sorted.length - 1) * 0.25)];
    const q3 = sorted[Math.floor((sorted.length - 1) * 0.75)];
    const iqr = q3 - q1;
    const low = q1 - 1.5 * iqr;
    const high = q3 + 1.5 * iqr;
    return sorted.filter((v) => v >= low && v <= high);
  }, []);

  const percentile = useCallback((arr: number[], p: number) => {
    if (arr.length === 0) return 0;
    const s = arr.slice().sort((a, b) => a - b);
    const idx = (s.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return s[lo];
    const weight = idx - lo;
    return s[lo] * (1 - weight) + s[hi] * weight;
  }, []);

  const variance = useCallback((arr: number[]) => {
    if (arr.length === 0) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((s, v) => s + (v - mean) * (v - mean), 0) / arr.length;
  }, []);

  // ---------------------
  // Decay logic
  // ---------------------
  const applyDecay = useCallback((now = Date.now()) => {
    // If no previous sample, nothing to decay (just set lastSampleTime)
    if (!lastSampleTimeRef.current) {
      lastSampleTimeRef.current = now;
      return;
    }

    const dt = now - lastSampleTimeRef.current;
    if (dt <= 0) return;

    // Exponential decay factor for half-life (factor in (0,1])
    // factor = 0.5^(dt / halfLifeMs)
    const factor = Math.pow(0.5, dt / halfLifeMs);

    // Decay EMA toward baseline (not toward 0)
    const prevEma = throughputEMARef.current || 0;
    const newEma = decayBaseline + (prevEma - decayBaseline) * factor;

    throughputEMARef.current = Math.max(MIN_THROUGHPUT, Math.min(MAX_THROUGHPUT, newEma));

    // advance lastSampleTimeRef so we don't repeatedly apply the same dt
    lastSampleTimeRef.current = now;
  }, [decayBaseline, halfLifeMs]);

  // ---------------------
  // Calculations (use applyDecay lazily)
  // ---------------------
  const calculateConservativeThroughput = useCallback((): number => {
    // apply decay before reading EMA
    applyDecay();

    throughputSamplesRef.current = cleanupOldSamples(throughputSamplesRef.current);
    const samples = throughputSamplesRef.current.map((s) => s.throughput);

    if (samples.length === 0) {
      return throughputEMARef.current || 0;
    }

    const filtered = filterOutliersIQR(samples);
    if (filtered.length === 0) return throughputEMARef.current || 0;

    const pval = percentile(filtered, CONSERVATIVE_PERCENTILE);
    const ema = throughputEMARef.current || pval;
    const conservative = Math.min(ema, pval * 1.05);
    return Math.max(MIN_THROUGHPUT, Math.min(MAX_THROUGHPUT, conservative));
  }, [applyDecay, cleanupOldSamples, filterOutliersIQR, percentile]);

  const calculateWeightedThroughput = useCallback((): number => {
    // apply decay before reading EMA
    applyDecay();

    throughputSamplesRef.current = cleanupOldSamples(throughputSamplesRef.current);
    const samples = throughputSamplesRef.current;
    if (samples.length === 0) return throughputEMARef.current || 0;

    const values = samples.map((s) => s.throughput);
    const filtered = filterOutliersIQR(values);
    if (filtered.length === 0) return throughputEMARef.current || 0;

    const now = Date.now();
    let weightedSum = 0;
    let totalWeight = 0;
    filtered.forEach((t) => {
      const s = samples.find((x) => x.throughput === t);
      if (!s) return;
      const age = Math.max(0, now - s.timestamp);
      const recency = Math.max(0.01, 1 - age / MAX_THROUGHPUT_SAMPLE_AGE);
      const sizeWeight = Math.min(1, s.bytes / 200_000);
      const w = recency * sizeWeight;
      weightedSum += t * w;
      totalWeight += w;
    });

    const simpleWeighted = totalWeight > 0 ? weightedSum / totalWeight : filtered[Math.floor(filtered.length / 2)];
    const p50 = percentile(filtered, 0.5);
    const final = p50 * 0.6 + simpleWeighted * 0.4;
    return Math.max(MIN_THROUGHPUT, Math.min(MAX_THROUGHPUT, final));
  }, [applyDecay, cleanupOldSamples, filterOutliersIQR, percentile]);

  const getVideoThroughput = useCallback((): number => {
    // apply decay before reading EMA
    applyDecay();

    videoThroughputSamplesRef.current = cleanupOldSamples(videoThroughputSamplesRef.current);
    const arr = videoThroughputSamplesRef.current.map((s) => s.throughput);
    if (arr.length === 0) return throughputEMARef.current || 0;
    const filtered = filterOutliersIQR(arr);
    return percentile(filtered, 0.5);
  }, [applyDecay, cleanupOldSamples, filterOutliersIQR, percentile]);

  // ---------------------
  // update method
  // ---------------------
  const updateThroughputMeasurement = useCallback(
    (
      bytes: number,
      durationMs: number,
      mediaType: MediaType,
      ttfbMs?: number | null
    ) => {
      try {
        if (bytes < MIN_SEGMENT_SIZE_FOR_MEASUREMENT || durationMs < 8) {
          // too small to be reliable
          return;
        }

        const downloadDurationMs =
          typeof ttfbMs === "number" && ttfbMs > 0
            ? Math.max(1, durationMs - ttfbMs)
            : Math.max(1, durationMs);

        const bits = bytes * 8;
        const throughput = bits / (downloadDurationMs / 1000); // bps
        const clamped = Math.max(MIN_THROUGHPUT, Math.min(MAX_THROUGHPUT, throughput));

        const now = Date.now();
        const sample: ThroughputSample = {
          timestamp: now,
          throughput: clamped,
          bytes,
          duration: downloadDurationMs,
          mediaType,
          segmentSize: bytes,
        };

        // Before adding new sample, apply decay for the elapsed idle time
        applyDecay(now);

        saveSample(sample);

        throughputSamplesRef.current = cleanupOldSamples(throughputSamplesRef.current);
        videoThroughputSamplesRef.current = cleanupOldSamples(videoThroughputSamplesRef.current);
        audioThroughputSamplesRef.current = cleanupOldSamples(audioThroughputSamplesRef.current);

        // Recalculate EWMA with dynamic alpha based on variance
        const values = throughputSamplesRef.current.map((s) => s.throughput);
        const varVal = variance(values);
        const alpha = Math.max(0.12, Math.min(0.45, 0.2 + (1 / (1 + varVal / (1e6))))); // heuristic
        const prev = throughputEMARef.current || clamped;
        throughputEMARef.current = alpha * clamped + (1 - alpha) * prev;

        // update lastSampleTimeRef already done in saveSample
        // debug
        // console.debug(
        //   "THROUGHPUT_SAMPLE",
        //   Math.round(clamped / 1000),
        //   "kbps",
        //   `ttfb=${ttfbMs ?? "n/a"}ms alpha=${alpha.toFixed(3)}`
        // );
      } catch (err) {
        console.error("updateThroughputMeasurement error", err);
      }
    },
    [applyDecay, cleanupOldSamples, saveSample, variance]
  );

  const reset = useCallback(() => {
    throughputSamplesRef.current = [];
    videoThroughputSamplesRef.current = [];
    audioThroughputSamplesRef.current = [];
    throughputEMARef.current = 0;
    lastSampleTimeRef.current = null;
  }, []);

  const getDiagnostics = useCallback(() => {
    // apply decay to make diagnostics reflect current (possibly decayed) state
    applyDecay();
    return {
      ema: throughputEMARef.current,
      weighted: calculateWeightedThroughput(),
      conservative: calculateConservativeThroughput(),
      rawSamples: throughputSamplesRef.current.slice(),
      videoSamples: videoThroughputSamplesRef.current.slice(),
      audioSamples: audioThroughputSamplesRef.current.slice(),
      lastSampleTime: lastSampleTimeRef.current,
    };
  }, [applyDecay, calculateWeightedThroughput, calculateConservativeThroughput]);

  return {
    throughputEMARef,
    updateThroughputMeasurement,
    getVideoThroughput,
    calculateWeightedThroughput,
    calculateConservativeThroughput,
    reset,
    getDiagnostics,
  };
}
