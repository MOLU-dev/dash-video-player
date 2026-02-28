// hooks/useDownloadManager.ts
import { useState, useCallback, useRef, useEffect } from "react";
import * as grpcWeb from "grpc-web";

import { grpcClient } from "@/utils/grpcClient";

import { SegmentRequest, SegmentChunk } from "@/proto/rpc_stream_pb";

import type { DownloadProgress, DownloadedVideo } from "@/types/download.types";

export const useDownloadManager = () => {
  const [downloads, setDownloads] = useState<DownloadProgress[]>([]);
  const [downloadedVideos, setDownloadedVideos] = useState<DownloadedVideo[]>(
    []
  );
  const [isInitialized, setIsInitialized] = useState(false);

  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  useEffect(() => {
    const loadDownloadedVideos = async () => {
      try {
        const videos = await getAllDownloadedVideos();
        setDownloadedVideos(videos);
        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to load downloaded videos:", error);
        setIsInitialized(true);
      }
    };

    loadDownloadedVideos();
  }, []);

  // Helper function to get all downloaded videos from IndexedDB
  const getAllDownloadedVideos = useCallback(async (): Promise<
    DownloadedVideo[]
  > => {
    try {
      const databases = await window.indexedDB.databases();
      const videoDatabases = databases.filter(
        (db) => db.name && db.name.startsWith("offline-video-")
      );

      const videos: DownloadedVideo[] = [];
      const incompleteDownloads: DownloadProgress[] = [];

      for (const dbInfo of videoDatabases) {
        if (!dbInfo.name) continue;

        const videoId = dbInfo.name.replace("offline-video-", "");

        try {
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(dbInfo.name!);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });

          // Get metadata
          const metadata = await new Promise<Record<string, any>>(
            (resolve, reject) => {
              const transaction = db.transaction(["metadata"], "readonly");
              const metadataStore = transaction.objectStore("metadata");
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
              request.onerror = () => reject(request.error);
            }
          );

          // Count downloaded segments
          const segmentsCount = await new Promise<number>((resolve, reject) => {
            const transaction = db.transaction(["segments"], "readonly");
            const segmentsStore = transaction.objectStore("segments");
            const request = segmentsStore.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });

          const totalSegments = metadata.totalSegments || 0;
          const isComplete =
            segmentsCount >= totalSegments && totalSegments > 0;

          db.close();

          if (metadata.title && metadata.duration !== undefined) {
            if (isComplete) {
              // Complete download
              videos.push({
                videoId,
                title: metadata.title,
                duration: metadata.duration,
                quality: metadata.quality || "Unknown",
                downloadDate: metadata.downloadDate || new Date(),
                size: metadata.size || 0,
                thumbnail: metadata.thumbnail || "",
                status: "completed",
              });
            } else {
              // Incomplete download - add to downloads state
              incompleteDownloads.push({
                videoId,
                totalSegments,
                downloadedSegments: segmentsCount,
                status: "incomplete",
                quality: metadata.quality || "Unknown",
                representationId: metadata.representationId,
                title: metadata.title,
                thumbnail: metadata.thumbnail,
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to load video ${videoId}:`, error);
        }
      }

      // Set incomplete downloads to state
      if (incompleteDownloads.length > 0) {
        setDownloads((prev) => {
          // Merge with existing downloads, avoiding duplicates
          const existingIds = new Set(prev.map((d) => d.videoId));
          const newIncomplete = incompleteDownloads.filter(
            (d) => !existingIds.has(d.videoId)
          );
          return [...prev, ...newIncomplete];
        });
      }

      return videos;
    } catch (error) {
      console.error("Error loading downloaded videos:", error);
      return [];
    }
  }, []);

  // const isVideoDownloaded = useCallback(
  //   (videoId: string): boolean => {
  //     return downloadedVideos.some((video) => video.videoId === videoId);
  //   },
  //   [downloadedVideos]
  // );

  // hooks/useDownloadManager.ts - Add this function
  const clearAllDownloads = useCallback(async () => {
    // Cancel all ongoing downloads
    abortControllersRef.current.forEach((controller, videoId) => {
      controller.abort();
    });
    abortControllersRef.current.clear();

    // Clear React state
    setDownloads([]);
    setDownloadedVideos([]);

    // Delete all IndexedDB databases for downloaded videos
    try {
      const databases = await window.indexedDB.databases();
      const videoDatabases = databases.filter(
        (db) => db.name && db.name.startsWith("offline-video-")
      );

      const deletePromises = videoDatabases.map((dbInfo) => {
        if (dbInfo.name) {
          return new Promise<void>((resolve, reject) => {
            const request = indexedDB.deleteDatabase(dbInfo.name!);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
        return Promise.resolve();
      });

      await Promise.all(deletePromises);
      console.log(`Cleared ${videoDatabases.length} downloaded videos`);
    } catch (error) {
      console.error("Error clearing all downloads:", error);
      throw error;
    }
  }, []);

  const getDownloadProgress = useCallback(
    (videoId: string): DownloadProgress | undefined => {
      return downloads.find((d) => d.videoId === videoId);
    },
    [downloads]
  );
  const isVideoDownloaded = useCallback(
    (videoId: string): boolean => {
      return downloadedVideos.some((video) => video.videoId === videoId);
    },
    [downloadedVideos]
  );

  // const getDownloadProgress = useCallback(
  //   (videoId: string): DownloadProgress | undefined => {
  //     return downloads.find((d) => d.videoId === videoId);
  //   },
  //   [downloads]
  // );

  const encryptData = useCallback(
    async (data: Uint8Array, key: string): Promise<Uint8Array> => {
      const keyBytes = new TextEncoder().encode(key);
      const encrypted = new Uint8Array(data.length);

      for (let i = 0; i < data.length; i++) {
        encrypted[i] = data[i] ^ keyBytes[i % keyBytes.length];
      }

      return encrypted;
    },
    []
  );

  const decryptData = useCallback(
    async (data: Uint8Array, key: string): Promise<Uint8Array> => {
      return encryptData(data, key);
    },
    [encryptData]
  );

  const getDeviceKey = useCallback((): string => {
    return `device-key-${navigator.userAgent}-${window.screen.width}x${window.screen.height}`;
  }, []);

  // const downloadVideo = useCallback(
  //   async (
  //     videoId: string,
  //     representationId: string,
  //     totalSegments: number,
  //     title: string,
  //     duration: number,
  //     quality: string,
  //     thumbnail: string
  //   ) => {
  //     if (
  //       isVideoDownloaded(videoId) ||
  //       downloads.some(
  //         (d) => d.videoId === videoId && d.status === "downloading"
  //       )
  //     ) {
  //       return;
  //     }

  //     setDownloads((prev) => [
  //       ...prev,
  //       {
  //         videoId,
  //         totalSegments,
  //         downloadedSegments: 0,
  //         status: "downloading",
  //         quality,
  //       },
  //     ]);

  //     const deviceKey = getDeviceKey();
  //     const controller = new AbortController();
  //     abortControllersRef.current.set(videoId, controller);

  //     try {
  //       const dbName = `offline-video-${videoId}`;

  //       // Open database
  //       const db = await new Promise<IDBDatabase>((resolve, reject) => {
  //         const request = indexedDB.open(dbName, 1);

  //         request.onupgradeneeded = (event) => {
  //           const db = (event.target as IDBOpenDBRequest).result;
  //           if (!db.objectStoreNames.contains("segments")) {
  //             db.createObjectStore("segments", { keyPath: "segmentNumber" });
  //           }
  //           if (!db.objectStoreNames.contains("metadata")) {
  //             db.createObjectStore("metadata", { keyPath: "key" });
  //           }
  //         };

  //         request.onsuccess = () => resolve(request.result);
  //         request.onerror = () => reject(request.error);
  //       });

  //       // Store metadata in a single transaction
  //       await new Promise<void>((resolve, reject) => {
  //         const transaction = db.transaction(["metadata"], "readwrite");
  //         const metadataStore = transaction.objectStore("metadata");

  //         transaction.oncomplete = () => resolve();
  //         transaction.onerror = () => reject(transaction.error);

  //         metadataStore.put({ key: "title", value: title });
  //         metadataStore.put({ key: "duration", value: duration });
  //         metadataStore.put({ key: "quality", value: quality });
  //         metadataStore.put({ key: "downloadDate", value: new Date() });
  //         metadataStore.put({ key: "thumbnail", value: thumbnail });
  //       });

  //       let totalSize = 0;

  //       // Download segments one by one, each in its own transaction
  //       for (
  //         let segmentNumber = 1;
  //         segmentNumber <= totalSegments;
  //         segmentNumber++
  //       ) {
  //         if (controller.signal.aborted) {
  //           throw new DOMException("Download aborted", "AbortError");
  //         }

  //         // Fetch segment data
  //         const req = new SegmentRequest();
  //         req.setVideoId(videoId);
  //         req.setRepresentationId(representationId);
  //         req.setSegmentNumber(segmentNumber);
  //         req.setInitSegment(segmentNumber === 1);
  //         req.setMedia("video");

  //         const call = grpcClient.streamSegment(req, {});
  //         const chunks: Uint8Array[] = [];

  //         await new Promise<void>((resolve, reject) => {
  //           call.on("data", (chunk: SegmentChunk) => {
  //             chunks.push(chunk.getData_asU8());
  //           });

  //           call.on("end", () => {
  //             resolve();
  //           });

  //           call.on("error", (err: grpcWeb.RpcError) => {
  //             reject(err);
  //           });
  //         });

  //         // Combine chunks
  //         const totalLength = chunks.reduce((sum, arr) => sum + arr.length, 0);
  //         const segmentData = new Uint8Array(totalLength);
  //         let offset = 0;
  //         chunks.forEach((arr) => {
  //           segmentData.set(arr, offset);
  //           offset += arr.length;
  //         });

  //         totalSize += segmentData.length;

  //         // Encrypt data
  //         const encryptedData = await encryptData(segmentData, deviceKey);

  //         // Store segment in a separate transaction
  //         await new Promise<void>((resolve, reject) => {
  //           const transaction = db.transaction(["segments"], "readwrite");
  //           const segmentsStore = transaction.objectStore("segments");

  //           transaction.oncomplete = () => resolve();
  //           transaction.onerror = () => reject(transaction.error);

  //           const putRequest = segmentsStore.put({
  //             segmentNumber,
  //             data: encryptedData,
  //           });

  //           putRequest.onerror = () => reject(putRequest.error);
  //         });

  //         // Update progress
  //         setDownloads((prev) =>
  //           prev.map((d) =>
  //             d.videoId === videoId
  //               ? { ...d, downloadedSegments: segmentNumber }
  //               : d
  //           )
  //         );
  //       }

  //       // Complete download
  //       setDownloads((prev) => prev.filter((d) => d.videoId !== videoId));
  //       setDownloadedVideos((prev) => [
  //         ...prev,
  //         {
  //           videoId,
  //           title,
  //           duration,
  //           quality,
  //           downloadDate: new Date(),
  //           size: totalSize,
  //           thumbnail,
  //         },
  //       ]);

  //       db.close();
  //     } catch (error) {
  //       if (error instanceof DOMException && error.name === "AbortError") {
  //         setDownloads((prev) =>
  //           prev.map((d) =>
  //             d.videoId === videoId ? { ...d, status: "paused" } : d
  //           )
  //         );
  //       } else {
  //         console.error("Download failed:", error);
  //         setDownloads((prev) =>
  //           prev.map((d) =>
  //             d.videoId === videoId ? { ...d, status: "error" } : d
  //           )
  //         );
  //       }
  //     }
  //   },
  //   [downloads, isVideoDownloaded, encryptData, getDeviceKey]
  // );

  const downloadVideo = useCallback(
    async (
      videoId: string,
      representationId: string,
      totalSegments: number,
      title: string,
      duration: number,
      quality: string,
      thumbnail: string,
      startFromSegment: number = 1 // New parameter for resume
    ) => {
      const existingDownload = downloads.find((d) => d.videoId === videoId);

      // If already downloaded, don't start again
      if (isVideoDownloaded(videoId)) {
        return;
      }

      // If already downloading and not paused, don't start again
      if (existingDownload && existingDownload.status === "downloading") {
        return;
      }

      setDownloads((prev) => {
        const filtered = prev.filter((d) => d.videoId !== videoId);
        return [
          ...filtered,
          {
            videoId,
            totalSegments,
            downloadedSegments: startFromSegment - 1, // Start from previous progress
            status: "downloading",
            quality,
          },
        ];
      });

      const deviceKey = getDeviceKey();
      const controller = new AbortController();
      abortControllersRef.current.set(videoId, controller);

      try {
        const dbName = `offline-video-${videoId}`;

        // Open database
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
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

          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        // Store/update metadata only if starting from beginning
        if (startFromSegment === 1) {
          await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(["metadata"], "readwrite");
            const metadataStore = transaction.objectStore("metadata");

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);

            metadataStore.put({ key: "title", value: title });
            metadataStore.put({ key: "duration", value: duration });
            metadataStore.put({ key: "quality", value: quality });
            metadataStore.put({ key: "downloadDate", value: new Date() });
            metadataStore.put({ key: "thumbnail", value: thumbnail });
            metadataStore.put({ key: "videoId", value: videoId });
            metadataStore.put({
              key: "representationId",
              value: representationId,
            });
            metadataStore.put({ key: "totalSegments", value: totalSegments });
          });
        }

        let totalSize = 0;

        // Check existing size if resuming
        if (startFromSegment > 1) {
          const existingSize = await new Promise<number>((resolve, reject) => {
            const transaction = db.transaction(["metadata"], "readonly");
            const metadataStore = transaction.objectStore("metadata");
            const request = metadataStore.get("size");

            request.onsuccess = () => resolve(request.result?.value || 0);
            request.onerror = () => reject(request.error);
          });
          totalSize = existingSize;
        }

        // Download segments from startFromSegment
        for (
          let segmentNumber = startFromSegment;
          segmentNumber <= totalSegments;
          segmentNumber++
        ) {
          if (controller.signal.aborted) {
            throw new DOMException("Download aborted", "AbortError");
          }

          // Check if segment already exists (for extra safety)
          const segmentExists = await new Promise<boolean>((resolve) => {
            const transaction = db.transaction(["segments"], "readonly");
            const segmentsStore = transaction.objectStore("segments");
            const request = segmentsStore.get(segmentNumber);

            request.onsuccess = () => resolve(!!request.result);
            request.onerror = () => resolve(false);
          });

          if (segmentExists) {
            console.log(`Segment ${segmentNumber} already exists, skipping`);
            setDownloads((prev) =>
              prev.map((d) =>
                d.videoId === videoId
                  ? { ...d, downloadedSegments: segmentNumber }
                  : d
              )
            );
            continue;
          }

          // Fetch segment data
          const req = new SegmentRequest();
          req.setVideoId(videoId);
          req.setRepresentationId(representationId);
          req.setSegmentNumber(segmentNumber);
          req.setInitSegment(segmentNumber === 1);
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

          // Encrypt data
          const encryptedData = await encryptData(segmentData, deviceKey);

          // Store segment
          await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(["segments"], "readwrite");
            const segmentsStore = transaction.objectStore("segments");

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);

            const putRequest = segmentsStore.put({
              segmentNumber,
              data: encryptedData,
            });

            putRequest.onerror = () => reject(putRequest.error);
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

        // Update total size
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(["metadata"], "readwrite");
          const metadataStore = transaction.objectStore("metadata");

          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);

          metadataStore.put({ key: "size", value: totalSize });
        });

        // Complete download
        setDownloads((prev) => prev.filter((d) => d.videoId !== videoId));

        // Add to downloaded videos
        const updatedVideos = await getAllDownloadedVideos();
        setDownloadedVideos(updatedVideos);

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
    [
      downloads,
      isVideoDownloaded,
      encryptData,
      getDeviceKey,
      getAllDownloadedVideos,
    ]
  );

  // Update deleteDownloadedVideo to reload the list
  const deleteDownloadedVideo = useCallback(
    async (videoId: string) => {
      setDownloadedVideos((prev) => prev.filter((v) => v.videoId !== videoId));

      // Clean up database
      const dbName = `offline-video-${videoId}`;
      indexedDB.deleteDatabase(dbName);

      // Reload the list to ensure consistency
      const updatedVideos = await getAllDownloadedVideos();
      setDownloadedVideos(updatedVideos);
    },
    [getAllDownloadedVideos]
  );

  // const pauseDownload = useCallback((videoId: string) => {
  //   const controller = abortControllersRef.current.get(videoId);
  //   if (controller) {
  //     controller.abort();
  //     abortControllersRef.current.delete(videoId);
  //   }
  // }, []);

  const pauseDownload = useCallback((videoId: string) => {
    const controller = abortControllersRef.current.get(videoId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(videoId);
    }

    // DON'T remove from downloads array - just update status
    setDownloads((prev) =>
      prev.map((d) =>
        d.videoId === videoId ? { ...d, status: "paused" as const } : d
      )
    );
  }, []);

  const resumeIncompleteDownload = useCallback(
    async (videoId: string) => {
      try {
        const dbName = `offline-video-${videoId}`;
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(dbName);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        // Get metadata needed for resume
        const metadata = await new Promise<Record<string, any>>(
          (resolve, reject) => {
            const transaction = db.transaction(["metadata"], "readonly");
            const metadataStore = transaction.objectStore("metadata");
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
            request.onerror = () => reject(request.error);
          }
        );

        // Find last downloaded segment
        const segmentsCount = await new Promise<number>((resolve, reject) => {
          const transaction = db.transaction(["segments"], "readonly");
          const segmentsStore = transaction.objectStore("segments");
          const request = segmentsStore.count();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        db.close();

        // Start download from next segment
        const startFromSegment = segmentsCount + 1;

        downloadVideo(
          videoId,
          metadata.representationId,
          metadata.totalSegments,
          metadata.title,
          metadata.duration,
          metadata.quality,
          metadata.thumbnail,
          startFromSegment
        );
      } catch (error) {
        console.error("Error resuming incomplete download:", error);
      }
    },
    [downloadVideo]
  );

  // Enhanced resume function that checks existing progress
  const resumeDownload = useCallback(
    async (
      videoId: string,
      representationId: string,
      totalSegments: number,
      title: string,
      duration: number,
      quality: string,
      thumbnail: string
    ) => {
      const progress = getDownloadProgress(videoId);
      if (!progress) return;

      try {
        // Check what segments are already downloaded
        const dbName = `offline-video-${videoId}`;
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(dbName);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        // Find the last successfully downloaded segment
        let lastDownloadedSegment = 0;
        const transaction = db.transaction(["segments"], "readonly");
        const segmentsStore = transaction.objectStore("segments");

        // Get the highest segment number that exists
        const request = segmentsStore.openCursor(null, "prev");
        await new Promise<void>((resolve) => {
          request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
              lastDownloadedSegment = cursor.value.segmentNumber;
              resolve();
            } else {
              resolve();
            }
          };
          request.onerror = () => resolve();
        });

        db.close();

        // Start from the next segment
        const startFromSegment = Math.max(1, lastDownloadedSegment + 1);

        downloadVideo(
          videoId,
          representationId,
          totalSegments,
          title,
          duration,
          quality,
          thumbnail,
          startFromSegment
        );
      } catch (error) {
        console.error("Error checking download progress:", error);
        // Fallback: start from the beginning
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

  const getDownloadStatus = useCallback(async (videoId: string) => {
    try {
      const dbName = `offline-video-${videoId}`;
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Get metadata
      const metadata = await new Promise<any>((resolve, reject) => {
        const transaction = db.transaction(["metadata"], "readonly");
        const metadataStore = transaction.objectStore("metadata");
        const request = metadataStore.get("totalSegments");

        request.onsuccess = () => resolve(request.result?.value);
        request.onerror = () => reject(request.error);
      });

      // Count downloaded segments
      const segmentsCount = await new Promise<number>((resolve) => {
        const transaction = db.transaction(["segments"], "readonly");
        const segmentsStore = transaction.objectStore("segments");
        const request = segmentsStore.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      });

      db.close();

      return {
        totalSegments: metadata || 0,
        downloadedSegments: segmentsCount,
        progress: metadata ? (segmentsCount / metadata) * 100 : 0,
      };
    } catch (error) {
      return null;
    }
  }, []);

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

  // const deleteDownloadedVideo = useCallback((videoId: string) => {
  //   setDownloadedVideos((prev) => prev.filter((v) => v.videoId !== videoId));

  //   // Clean up database
  //   const dbName = `offline-video-${videoId}`;
  //   indexedDB.deleteDatabase(dbName);
  // }, []);

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

        // Get metadata in a single transaction
        const metadata = await new Promise<Record<string, any>>(
          (resolve, reject) => {
            const transaction = db.transaction(["metadata"], "readonly");
            const metadataStore = transaction.objectStore("metadata");
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
            request.onerror = () => reject(request.error);
          }
        );

        // Get all segments in a single transaction
        const segments = await new Promise<
          { segmentNumber: number; data: Uint8Array }[]
        >((resolve, reject) => {
          const transaction = db.transaction(["segments"], "readonly");
          const segmentsStore = transaction.objectStore("segments");
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
          request.onerror = () => reject(request.error);
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
    isInitialized, // Return this to show loading state if needed
    clearAllDownloads,
    getDownloadStatus, // Add this
    resumeIncompleteDownload,
  };
};
