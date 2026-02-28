import { useRef, useCallback } from 'react';
import type { ThroughputSample, MediaType } from '../types/player.types';
import {
  THROUGHPUT_WINDOW_SIZE,
  MIN_SEGMENT_SIZE_FOR_MEASUREMENT,
  MAX_THROUGHPUT_SAMPLE_AGE,
} from '../constants/player.constants';

export function useThroughputMeasurement() {
  const throughputEMARef = useRef(0);
  const throughputSamplesRef = useRef<ThroughputSample[]>([]);
  const videoThroughputSamplesRef = useRef<ThroughputSample[]>([]);
  const audioThroughputSamplesRef = useRef<ThroughputSample[]>([]);

  const cleanupOldSamples = useCallback((samples: ThroughputSample[]) => {
    const now = Date.now();
    const cutoffTime = now - MAX_THROUGHPUT_SAMPLE_AGE;
    return samples.filter((sample) => sample.timestamp > cutoffTime);
  }, []);

  const calculateWeightedThroughput = useCallback((): number => {
    const samples = throughputSamplesRef.current;
    if (samples.length === 0) return throughputEMARef.current || 0;

    if (samples.length < 3) {
      const sum = samples.reduce((acc, sample) => acc + sample.throughput, 0);
      return sum / samples.length;
    }

    const now = Date.now();
    let totalWeight = 0;
    let weightedSum = 0;

    samples.forEach((sample) => {
      const age = now - sample.timestamp;
      const recencyWeight = Math.max(0, 1 - age / MAX_THROUGHPUT_SAMPLE_AGE);
      const sizeWeight = Math.min(1, sample.bytes / 500000);
      const weight = recencyWeight * sizeWeight;

      weightedSum += sample.throughput * weight;
      totalWeight += weight;
    });

    if (samples.length >= 5) {
      const simpleWeighted = totalWeight > 0 ? weightedSum / totalWeight : 0;
      const percentileBased = calculatePercentileThroughput();
      return percentileBased * 0.7 + simpleWeighted * 0.3;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : samples[0].throughput;
  }, []);

  const calculatePercentileThroughput = useCallback((): number => {
    const samples = throughputSamplesRef.current;
    if (samples.length === 0) return 0;

    const throughputs = samples.map((s) => s.throughput).sort((a, b) => a - b);
    const lowerIdx = Math.floor(throughputs.length * 0.25);
    const upperIdx = Math.floor(throughputs.length * 0.75);

    const filteredThroughputs = throughputs.slice(lowerIdx, upperIdx + 1);
    return (
      filteredThroughputs.reduce((a, b) => a + b, 0) /
      filteredThroughputs.length
    );
  }, []);

  const getVideoThroughput = useCallback((): number => {
    const samples = videoThroughputSamplesRef.current;
    if (samples.length === 0) return throughputEMARef.current;

    const throughputs = samples.map((s) => s.throughput).sort((a, b) => a - b);
    const medianIndex = Math.floor(throughputs.length / 2);
    return throughputs[medianIndex];
  }, []);

  const updateThroughputMeasurement = useCallback(
    (bytes: number, durationMs: number, mediaType: MediaType) => {
      if (bytes < MIN_SEGMENT_SIZE_FOR_MEASUREMENT || durationMs < 10) {
        console.log(
          `Skipping throughput measurement: bytes=${bytes}, duration=${durationMs}ms`
        );
        return;
      }

      const now = Date.now();
      const bits = bytes * 8;
      const throughput = bits / (durationMs / 1000);

      const sample: ThroughputSample = {
        timestamp: now,
        throughput,
        bytes,
        duration: durationMs,
        mediaType,
        segmentSize: bytes,
      };

      throughputSamplesRef.current.push(sample);

      if (mediaType === "video") {
        videoThroughputSamplesRef.current.push(sample);
      } else {
        audioThroughputSamplesRef.current.push(sample);
      }

      throughputSamplesRef.current = cleanupOldSamples(
        throughputSamplesRef.current
      );
      videoThroughputSamplesRef.current = cleanupOldSamples(
        videoThroughputSamplesRef.current
      );
      audioThroughputSamplesRef.current = cleanupOldSamples(
        audioThroughputSamplesRef.current
      );

      if (throughputSamplesRef.current.length > THROUGHPUT_WINDOW_SIZE * 2) {
        throughputSamplesRef.current = throughputSamplesRef.current.slice(
          -THROUGHPUT_WINDOW_SIZE
        );
      }
      if (videoThroughputSamplesRef.current.length > THROUGHPUT_WINDOW_SIZE) {
        videoThroughputSamplesRef.current =
          videoThroughputSamplesRef.current.slice(-THROUGHPUT_WINDOW_SIZE);
      }
      if (audioThroughputSamplesRef.current.length > THROUGHPUT_WINDOW_SIZE) {
        audioThroughputSamplesRef.current =
          audioThroughputSamplesRef.current.slice(-THROUGHPUT_WINDOW_SIZE);
      }

      const effectiveThroughput = calculateWeightedThroughput();

      const alpha = 0.3;
      throughputEMARef.current = throughputEMARef.current
        ? alpha * effectiveThroughput + (1 - alpha) * throughputEMARef.current
        : effectiveThroughput;

      console.log(
        `Throughput update: ${Math.round(
          throughput / 1000
        )}kbps (raw) -> ${Math.round(
          effectiveThroughput / 1000
        )}kbps (weighted) [${mediaType}]`
      );
    },
    [cleanupOldSamples, calculateWeightedThroughput]
  );

  return {
    throughputEMARef,
    updateThroughputMeasurement,
    getVideoThroughput,
    calculateWeightedThroughput,
  };
}