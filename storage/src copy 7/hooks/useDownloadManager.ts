// components/VideoPlayer/hooks/useDownloadManager.ts
import { useState, useCallback, useRef } from "react";
import * as grpcWeb from "grpc-web";
import { grpcClient } from "../../../src/utils/grpcClient";
import { SegmentRequest, SegmentChunk } from "../../../src/proto/rpc_stream_pb";

interface DownloadProgress {
  videoId: string;
  totalSegments: number;
  downloadedSegments: number;
  status: "downloading" | "paused" | "completed" | "error";
  quality: string;
}

interface DownloadedVideo {
  videoId: string;
  title: string;
  duration: number;
  quality: string;
  downloadDate: Date;
  size: number;
  thumbnail: string;
}

export const useDownloadManager = () => {
  const [downloads, setDownloads] = useState<DownloadProgress[]>([]);
  const [downloadedVideos, setDownloadedVideos] = useState<DownloadedVideo[]>(
    []
  );
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Check if video is downloaded
  const isVideoDownloaded = useCallback(
    (videoId: string): boolean => {
      return downloadedVideos.some((video) => video.videoId === videoId);
    },
    [downloadedVideos]
  );

  // Get download progress for a video
  const getDownloadProgress = useCallback(
    (videoId: string): DownloadProgress | undefined => {
      return downloads.find((d) => d.videoId === videoId);
    },
    [downloads]
  );

  // Encrypt data for secure storage
  const encryptData = useCallback(
    async (data: Uint8Array, key: string): Promise<Uint8Array> => {
      // Simple XOR encryption for demonstration
      // In production, use Web Crypto API with a secure key management system
      const keyBytes = new TextEncoder().encode(key);
      const encrypted = new Uint8Array(data.length);

      for (let i = 0; i < data.length; i++) {
        encrypted[i] = data[i] ^ keyBytes[i % keyBytes.length];
      }

      return encrypted;
    },
    []
  );

  // Decrypt data for playback
  const decryptData = useCallback(
    async (data: Uint8Array, key: string): Promise<Uint8Array> => {
      // XOR decryption (same as encryption)
      return encryptData(data, key);
    },
    [encryptData]
  );

  // Generate a device-specific key
  const getDeviceKey = useCallback((): string => {
    // Use a combination of device characteristics to create a unique key
    // In a real implementation, this would be more secure and stored securely
    return `device-key-${navigator.userAgent}-${window.screen.width}x${window.screen.height}`;
  }, []);

  // Download a video
  const downloadVideo = useCallback(
    async (
      videoId: string,
      representationId: string,
      totalSegments: number,
      title: string,
      duration: number,
      quality: string,
      thumbnail: string
    ) => {
      // Check if already downloaded or downloading
      if (
        isVideoDownloaded(videoId) ||
        downloads.some(
          (d) => d.videoId === videoId && d.status === "downloading"
        )
      ) {
        return;
      }

      // Add to downloads list
      setDownloads((prev) => [
        ...prev,
        {
          videoId,
          totalSegments,
          downloadedSegments: 0,
          status: "downloading",
          quality,
        },
      ]);

      const deviceKey = getDeviceKey();
      const controller = new AbortController();
      abortControllersRef.current.set(videoId, controller);

      try {
        // Create IndexedDB database for this video
        const dbName = `offline-video-${videoId}`;
        const request = indexedDB.open(dbName, 1);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains("segments")) {
            db.createObjectStore("segments", { keyPath: "segmentNumber" });
          }
          if (!db.objectStoreNames.contains("metadata")) {
            db.createObjectStore("metadata", { keyPath: "key" });
          }
        };

        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        // Store metadata
        const metadataTransaction = db.transaction("metadata", "readwrite");
        const metadataStore = metadataTransaction.objectStore("metadata");

        await Promise.all([
          new Promise((resolve, reject) => {
            const putRequest = metadataStore.put({
              key: "title",
              value: title,
            });
            putRequest.onsuccess = resolve;
            putRequest.onerror = reject;
          }),
          new Promise((resolve, reject) => {
            const putRequest = metadataStore.put({
              key: "duration",
              value: duration,
            });
            putRequest.onsuccess = resolve;
            putRequest.onerror = reject;
          }),
          new Promise((resolve, reject) => {
            const putRequest = metadataStore.put({
              key: "quality",
              value: quality,
            });
            putRequest.onsuccess = resolve;
            putRequest.onerror = reject;
          }),
          new Promise((resolve, reject) => {
            const putRequest = metadataStore.put({
              key: "downloadDate",
              value: new Date(),
            });
            putRequest.onsuccess = resolve;
            putRequest.onerror = reject;
          }),
          new Promise((resolve, reject) => {
            const putRequest = metadataStore.put({
              key: "thumbnail",
              value: thumbnail,
            });
            putRequest.onsuccess = resolve;
            putRequest.onerror = reject;
          }),
        ]);

        // Download all segments
        const segmentsTransaction = db.transaction("segments", "readwrite");
        const segmentsStore = segmentsTransaction.objectStore("segments");

        let totalSize = 0;

        for (
          let segmentNumber = 1;
          segmentNumber <= totalSegments;
          segmentNumber++
        ) {
          if (controller.signal.aborted) {
            throw new DOMException("Download aborted", "AbortError");
          }

          const req = new SegmentRequest();
          req.setVideoId(videoId);
          req.setRepresentationId(representationId);
          req.setSegmentNumber(segmentNumber);
          req.setInitSegment(segmentNumber === 1); // First segment is init segment
          req.setMedia("video");

          const call = grpcClient.streamSegment(req, {});
          const chunks: Uint8Array[] = [];

          await new Promise<void>((resolve, reject) => {
            call.on("data", (chunk: SegmentChunk) => {
              chunks.push(chunk.getData_asU8());
            });

            call.on("end", () => {
              resolve();
            });

            call.on("error", (err: grpcWeb.RpcError) => {
              reject(err);
            });
          });

          // Combine chunks
          const totalLength = chunks.reduce((sum, arr) => sum + arr.length, 0);
          const segmentData = new Uint8Array(totalLength);
          let offset = 0;
          chunks.forEach((arr) => {
            segmentData.set(arr, offset);
            offset += arr.length;
          });

          totalSize += segmentData.length;

          // Encrypt and store segment
          const encryptedData = await encryptData(segmentData, deviceKey);

          await new Promise((resolve, reject) => {
            const putRequest = segmentsStore.put({
              segmentNumber,
              data: encryptedData,
            });
            putRequest.onsuccess = resolve;
            putRequest.onerror = reject;
          });

          // Update progress
          setDownloads((prev) =>
            prev.map((d) =>
              d.videoId === videoId
                ? { ...d, downloadedSegments: segmentNumber }
                : d
            )
          );
        }

        // Complete download
        setDownloads((prev) => prev.filter((d) => d.videoId !== videoId));
        setDownloadedVideos((prev) => [
          ...prev,
          {
            videoId,
            title,
            duration,
            quality,
            downloadDate: new Date(),
            size: totalSize,
            thumbnail,
          },
        ]);

        db.close();
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          setDownloads((prev) =>
            prev.map((d) =>
              d.videoId === videoId ? { ...d, status: "paused" } : d
            )
          );
        } else {
          console.error("Download failed:", error);
          setDownloads((prev) =>
            prev.map((d) =>
              d.videoId === videoId ? { ...d, status: "error" } : d
            )
          );
        }
      }
    },
    [downloads, isVideoDownloaded, encryptData, getDeviceKey]
  );

  // Pause download
  const pauseDownload = useCallback((videoId: string) => {
    const controller = abortControllersRef.current.get(videoId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(videoId);
    }
  }, []);

  // Resume download
  const resumeDownload = useCallback(
    (
      videoId: string,
      representationId: string,
      totalSegments: number,
      title: string,
      duration: number,
      quality: string,
      thumbnail: string
    ) => {
      const progress = getDownloadProgress(videoId);
      if (progress && progress.status === "paused") {
        downloadVideo(
          videoId,
          representationId,
          totalSegments,
          title,
          duration,
          quality,
          thumbnail
        );
      }
    },
    [downloadVideo, getDownloadProgress]
  );

  // Cancel download
  const cancelDownload = useCallback(
    (videoId: string) => {
      pauseDownload(videoId);
      setDownloads((prev) => prev.filter((d) => d.videoId !== videoId));

      // Clean up database
      const dbName = `offline-video-${videoId}`;
      indexedDB.deleteDatabase(dbName);
    },
    [pauseDownload]
  );

  // Delete downloaded video
  const deleteDownloadedVideo = useCallback((videoId: string) => {
    setDownloadedVideos((prev) => prev.filter((v) => v.videoId !== videoId));

    // Clean up database
    const dbName = `offline-video-${videoId}`;
    indexedDB.deleteDatabase(dbName);
  }, []);

  // Play downloaded video
  const playDownloadedVideo = useCallback(
    async (videoId: string) => {
      const deviceKey = getDeviceKey();
      const dbName = `offline-video-${videoId}`;

      try {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(dbName);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        // Get metadata
        const metadataTransaction = db.transaction("metadata", "readonly");
        const metadataStore = metadataTransaction.objectStore("metadata");

        const metadata = await new Promise<Record<string, any>>(
          (resolve, reject) => {
            const metadataObj: Record<string, any> = {};
            const request = metadataStore.openCursor();

            request.onsuccess = () => {
              const cursor = request.result;
              if (cursor) {
                metadataObj[cursor.value.key] = cursor.value.value;
                cursor.continue();
              } else {
                resolve(metadataObj);
              }
            };

            request.onerror = reject;
          }
        );

        // Get all segments in order
        const segmentsTransaction = db.transaction("segments", "readonly");
        const segmentsStore = segmentsTransaction.objectStore("segments");

        const segments = await new Promise<
          { segmentNumber: number; data: Uint8Array }[]
        >((resolve, reject) => {
          const segments: { segmentNumber: number; data: Uint8Array }[] = [];
          const request = segmentsStore.openCursor();

          request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
              segments.push(cursor.value);
              cursor.continue();
            } else {
              // Sort by segment number
              segments.sort((a, b) => a.segmentNumber - b.segmentNumber);
              resolve(segments);
            }
          };

          request.onerror = reject;
        });

        db.close();

        // Decrypt and concatenate segments
        const decryptedSegments = await Promise.all(
          segments.map(async (segment) => {
            return decryptData(segment.data, deviceKey);
          })
        );

        // Combine all segments into a single buffer
        const totalLength = decryptedSegments.reduce(
          (sum, arr) => sum + arr.length,
          0
        );
        const videoData = new Uint8Array(totalLength);
        let offset = 0;

        decryptedSegments.forEach((segment) => {
          videoData.set(segment, offset);
          offset += segment.length;
        });

        // Create a blob URL for the video
        const blob = new Blob([videoData], { type: "video/mp4" });
        const url = URL.createObjectURL(blob);

        return {
          url,
          metadata: {
            title: metadata.title,
            duration: metadata.duration,
            quality: metadata.quality,
            downloadDate: metadata.downloadDate,
            thumbnail: metadata.thumbnail,
          },
        };
      } catch (error) {
        console.error("Error playing downloaded video:", error);
        throw error;
      }
    },
    [decryptData, getDeviceKey]
  );

  return {
    downloads,
    downloadedVideos,
    downloadVideo,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    deleteDownloadedVideo,
    playDownloadedVideo,
    isVideoDownloaded,
    getDownloadProgress,
  };
};
