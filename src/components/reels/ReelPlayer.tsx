// import React, { useRef, useEffect, useState, useCallback } from "react";
// import { ReelItem } from "./ReelItem";
// import { useReelPrefetcher } from "@/hooks/reels/useReelPrefetcher";
// import { useReelManifestLoader } from "@/hooks/reels/useReelManifestLoader";
// import { getSegmentCache } from "@/lib/segmentCache";

// interface Video {
//   id: string;
//   title: string;
//   creator: string;
//   creatorAvatar?: string;
//   likeCount?: number;
//   commentCount?: number;
//   isLiked?: boolean;
// }

// interface ReelPlayerProps {
//   videos: Video[];
//   onLoadMore?: () => void;
//   onLike?: (videoId: string, isLiked: boolean) => void;
//   onComment?: (videoId: string) => void;
//   onShare?: (videoId: string) => void;
// }

// export function ReelPlayer({
//   videos,
//   onLoadMore,
//   onLike,
//   onComment,
//   onShare,
// }: ReelPlayerProps) {
//   const containerRef = useRef<HTMLDivElement>(null);
//   const [activeIndex, setActiveIndex] = useState(0);
//   const [touchStart, setTouchStart] = useState(0);
//   const [touchEnd, setTouchEnd] = useState(0);

//   const videoStatesRef = useRef(new Map());
//   const pendingIndexRef = useRef(0);
//   const debounceTimerRef = useRef<number | null>(null);

//   // Load manifests for all videos
//   const { manifestsLoaded, videoRepsMap } = useReelManifestLoader({
//     videoIds: videos.map((v) => v.id),
//   });

//   // Smart prefetching
//   const { cancelAllPrefetches } = useReelPrefetcher({
//     videoId: videos[activeIndex]?.id,
//     activeIndex,
//     videos,
//     videoRepsMap,
//   });

//   const DISTANCES = {
//     RENDERED: 1, // Only render active ±1 (3 videos max)
//     PRESERVED: 3, // Keep state for ±3
//     EVICTED: 5, // Clean beyond ±5
//   };

//   const getVideoRenderState = useCallback(
//     (index: number) => {
//       const distance = Math.abs(index - activeIndex);
//       if (distance <= DISTANCES.RENDERED) return "RENDERED";
//       if (distance <= DISTANCES.PRESERVED) return "PRESERVED";
//       return "EVICTED";
//     },
//     [activeIndex]
//   );

//   // Intersection Observer
//   useEffect(() => {
//     const observer = new IntersectionObserver(
//       (entries) => {
//         entries.forEach((entry) => {
//           if (entry.isIntersecting) {
//             const index = Number(entry.target.getAttribute("data-index"));
//             pendingIndexRef.current = index;

//             if (debounceTimerRef.current) {
//               clearTimeout(debounceTimerRef.current);
//             }

//             debounceTimerRef.current = window.setTimeout(() => {
//               setActiveIndex(pendingIndexRef.current);
//             }, 150);
//           }
//         });
//       },
//       { threshold: 0.75 }
//     );

//     const reelItems = containerRef.current?.querySelectorAll("[data-index]");
//     reelItems?.forEach((item) => observer.observe(item));

//     return () => {
//       observer.disconnect();
//       if (debounceTimerRef.current) {
//         clearTimeout(debounceTimerRef.current);
//       }
//     };
//   }, [videos]);

//   // Load more videos
//   useEffect(() => {
//     if (activeIndex >= videos.length - 3 && onLoadMore) {
//       onLoadMore();
//     }
//   }, [activeIndex, videos.length, onLoadMore]);

//   // Cleanup distant videos
//   useEffect(() => {
//     const cleanupInterval = setInterval(() => {
//       const segmentCache = getSegmentCache();

//       videos.forEach((video, index) => {
//         const distance = Math.abs(index - activeIndex);

//         if (distance > DISTANCES.EVICTED) {
//             segmentCache.deleteVideo(video.id);
//             videoStatesRef.current.delete(video.id);
//         }
//       });
//     }, 30000); // Every 30 seconds

//     return () => clearInterval(cleanupInterval);
//   }, [activeIndex, videos]);

//   // Touch handlers (same as before)
//   const handleTouchStart = useCallback((e: React.TouchEvent) => {
//     setTouchStart(e.touches[0].clientY);
//   }, []);

//   const handleTouchMove = useCallback((e: React.TouchEvent) => {
//     setTouchEnd(e.touches[0].clientY);
//   }, []);

//   const handleTouchEnd = useCallback(() => {
//     if (!touchStart || !touchEnd) return;

//     const distance = touchStart - touchEnd;
//     const isSwipeUp = distance > 50;
//     const isSwipeDown = distance < -50;

//     if (isSwipeUp && activeIndex < videos.length - 1) {
//       containerRef.current?.children[activeIndex + 1]?.scrollIntoView({
//         behavior: "smooth",
//         block: "start",
//       });
//     } else if (isSwipeDown && activeIndex > 0) {
//       containerRef.current?.children[activeIndex - 1]?.scrollIntoView({
//         behavior: "smooth",
//         block: "start",
//       });
//     }

//     setTouchStart(0);
//     setTouchEnd(0);
//   }, [touchStart, touchEnd, activeIndex, videos.length]);

//   // Show loading if manifests not ready
//   if (!manifestsLoaded) {
//     return (
//       <div className="loading-container">
//         <div className="spinner" />
//         <p>Loading videos...</p>
//         <style jsx>{`
//           .loading-container {
//             display: flex;
//             flex-direction: column;
//             align-items: center;
//             justify-content: center;
//             height: 100vh;
//             background: #000;
//             color: white;
//             gap: 16px;
//           }
//           .spinner {
//             width: 50px;
//             height: 50px;
//             border: 4px solid rgba(255, 255, 255, 0.3);
//             border-top-color: white;
//             border-radius: 50%;
//             animation: spin 0.8s linear infinite;
//           }
//           @keyframes spin {
//             to {
//               transform: rotate(360deg);
//             }
//           }
//         `}</style>
//       </div>
//     );
//   }

//   return (
//     <div
//       ref={containerRef}
//       className="reel-player"
//       onTouchStart={handleTouchStart}
//       onTouchMove={handleTouchMove}
//       onTouchEnd={handleTouchEnd}
//     >
//       {videos.map((video, index) => {
//         const renderState = getVideoRenderState(index);
//         const savedState = videoStatesRef.current.get(video.id);

//         if (renderState === "EVICTED" || renderState === "PRESERVED") {
//           return (
//             <div
//               key={video.id}
//               data-index={index}
//               className="reel-placeholder"
//             />
//           );
//         }

//         return (
//           <div key={video.id} data-index={index}>
//             <ReelItem
//               videoId={video.id}
//               title={video.title}
//               creator={video.creator}
//               creatorAvatar={video.creatorAvatar}
//               isActive={index === activeIndex}
//               initialTime={savedState?.currentTime || 0}
//               onStateChange={(state) =>
//                 videoStatesRef.current.set(video.id, state)
//               }
//               onLike={onLike}
//               onComment={onComment}
//               onShare={onShare}
//               likeCount={video.likeCount}
//               commentCount={video.commentCount}
//               isLiked={video.isLiked}
//             />
//           </div>
//         );
//       })}

//       <div className="progress-indicator">
//         {videos.slice(0, Math.min(videos.length, 20)).map((_, index) => (
//           <div
//             key={index}
//             className={`progress-dot ${index === activeIndex ? "active" : ""}`}
//           />
//         ))}
//       </div>

//       <style jsx>{`
//         .reel-player {
//           width: 100vw;
//           height: 100vh;
//           overflow-y: scroll;
//           scroll-snap-type: y mandatory;
//           -webkit-overflow-scrolling: touch;
//           scrollbar-width: none;
//           background: #000;
//           overscroll-behavior: contain;
//         }
//         .reel-player::-webkit-scrollbar {
//           display: none;
//         }
//         .reel-placeholder {
//           width: 100vw;
//           height: 100vh;
//           scroll-snap-align: start;
//           background: #000;
//         }
//         .progress-indicator {
//           position: fixed;
//           top: 50%;
//           right: 4px;
//           transform: translateY(-50%);
//           display: flex;
//           flex-direction: column;
//           gap: 6px;
//           z-index: 100;
//           pointer-events: none;
//         }
//         .progress-dot {
//           width: 4px;
//           height: 4px;
//           border-radius: 50%;
//           background: rgba(255, 255, 255, 0.4);
//           transition: all 0.3s ease;
//         }
//         .progress-dot.active {
//           height: 16px;
//           background: white;
//           border-radius: 2px;
//         }
//         @media (min-width: 768px) {
//           .reel-player {
//             max-width: 480px;
//             margin: 0 auto;
//             border-left: 1px solid #333;
//             border-right: 1px solid #333;
//           }
//         }
//       `}</style>
//     </div>
//   );
// }


import React, { useRef, useEffect, useState, useCallback } from "react";
import { ReelItem } from "./ReelItem";
import { useReelPrefetcher } from "@/hooks/reels/useReelPrefetcher";
import { useReelManifestLoader } from "@/hooks/reels/useReelManifestLoader";
import { getSegmentCache } from "@/lib/segmentCache";

interface Video {
  id: string;
  title: string;
  creator: string;
  creatorAvatar?: string;
  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean;
}

interface ReelPlayerProps {
  videos: Video[];
  onLoadMore?: () => void;
  onLike?: (videoId: string, isLiked: boolean) => void;
  onComment?: (videoId: string) => void;
  onShare?: (videoId: string) => void;
  // Optional: pass current network throughput for smarter prefetching
  currentThroughput?: number;
}

export function ReelPlayer({
  videos,
  onLoadMore,
  onLike,
  onComment,
  onShare,
  currentThroughput,
}: ReelPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const videoStatesRef = useRef(new Map());
  const pendingIndexRef = useRef(0);
  const debounceTimerRef = useRef<number | null>(null);

  // Load manifests for all videos
  const { manifestsLoaded, videoRepsMap } = useReelManifestLoader({
    videoIds: videos.map((v) => v.id),
  });

  // Smart prefetching - destructure only what we need
  const { prefetchMetadata } = useReelPrefetcher({
    videoId: videos[activeIndex]?.id,
    activeIndex,
    videos,
    videoRepsMap,
    currentThroughput, // Pass optional throughput
  });

  const DISTANCES = {
    RENDERED: 1, // Only render active ±1 (3 videos max)
    PRESERVED: 3, // Keep state for ±3
    EVICTED: 5, // Clean beyond ±5
  };

  const getVideoRenderState = useCallback(
    (index: number) => {
      const distance = Math.abs(index - activeIndex);
      if (distance <= DISTANCES.RENDERED) return "RENDERED";
      if (distance <= DISTANCES.PRESERVED) return "PRESERVED";
      return "EVICTED";
    },
    [activeIndex]
  );

  // Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-index"));
            pendingIndexRef.current = index;

            if (debounceTimerRef.current) {
              clearTimeout(debounceTimerRef.current);
            }

            debounceTimerRef.current = window.setTimeout(() => {
              setActiveIndex(pendingIndexRef.current);
            }, 150);
          }
        });
      },
      { threshold: 0.75 }
    );

    const reelItems = containerRef.current?.querySelectorAll("[data-index]");
    reelItems?.forEach((item) => observer.observe(item));

    return () => {
      observer.disconnect();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [videos]);

  // Load more videos
  useEffect(() => {
    if (activeIndex >= videos.length - 3 && onLoadMore) {
      onLoadMore();
    }
  }, [activeIndex, videos.length, onLoadMore]);

  // Cleanup distant videos
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const segmentCache = getSegmentCache();

      videos.forEach((video, index) => {
        const distance = Math.abs(index - activeIndex);

        if (distance > DISTANCES.EVICTED) {
          segmentCache.deleteVideo(video.id);
          videoStatesRef.current.delete(video.id);
        }
      });
    }, 30000); // Every 30 seconds

    return () => clearInterval(cleanupInterval);
  }, [activeIndex, videos]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.touches[0].clientY);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isSwipeUp = distance > 50;
    const isSwipeDown = distance < -50;

    if (isSwipeUp && activeIndex < videos.length - 1) {
      containerRef.current?.children[activeIndex + 1]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else if (isSwipeDown && activeIndex > 0) {
      containerRef.current?.children[activeIndex - 1]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

    setTouchStart(0);
    setTouchEnd(0);
  }, [touchStart, touchEnd, activeIndex, videos.length]);

  // Show loading if manifests not ready
  if (!manifestsLoaded) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading videos...</p>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #000;
            color: white;
            gap: 16px;
          }
          .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="reel-player"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {videos.map((video, index) => {
        const renderState = getVideoRenderState(index);
        const savedState = videoStatesRef.current.get(video.id);

        if (renderState === "EVICTED" || renderState === "PRESERVED") {
          return (
            <div
              key={video.id}
              data-index={index}
              className="reel-placeholder"
            />
          );
        }

        return (
          <div key={video.id} data-index={index}>
            <ReelItem
              videoId={video.id}
              title={video.title}
              creator={video.creator}
              creatorAvatar={video.creatorAvatar}
              isActive={index === activeIndex}
              isLive={videoRepsMap.get(video.id)?.isLive || false}
              initialTime={savedState?.currentTime || 0}
              onStateChange={(state) =>
                videoStatesRef.current.set(video.id, state)
              }
              onLike={onLike}
              onComment={onComment}
              onShare={onShare}
              likeCount={video.likeCount}
              commentCount={video.commentCount}
              isLiked={video.isLiked}
            />
          </div>
        );
      })}

      <div className="progress-indicator">
        {videos.slice(0, Math.min(videos.length, 20)).map((_, index) => (
          <div
            key={index}
            className={`progress-dot ${index === activeIndex ? "active" : ""}`}
          />
        ))}
      </div>

      <style jsx>{`
        .reel-player {
          width: 100vw;
          height: 100vh;
          overflow-y: scroll;
          scroll-snap-type: y mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          background: #000;
          overscroll-behavior: contain;
        }
        .reel-player::-webkit-scrollbar {
          display: none;
        }
        .reel-placeholder {
          width: 100vw;
          height: 100vh;
          scroll-snap-align: start;
          background: #000;
        }
        .progress-indicator {
          position: fixed;
          top: 50%;
          right: 4px;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          gap: 6px;
          z-index: 100;
          pointer-events: none;
        }
        .progress-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          transition: all 0.3s ease;
        }
        .progress-dot.active {
          height: 16px;
          background: white;
          border-radius: 2px;
        }
        @media (min-width: 768px) {
          .reel-player {
            max-width: 480px;
            margin: 0 auto;
            border-left: 1px solid #333;
            border-right: 1px solid #333;
          }
        }
      `}</style>
    </div>
  );
}