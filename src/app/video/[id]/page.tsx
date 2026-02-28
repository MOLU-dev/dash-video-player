// app/video/[id]/page.tsx
"use client";

import GrpcDashPlayer from "@/components/player/GrpcDashPlayer";
import { useParams, useSearchParams } from "next/navigation";

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams() as ReturnType<typeof useSearchParams>;
  const v = searchParams.get("v");
  const videoId = id ?? v;

  if (!videoId) return <p>Loading…</p>;

  return (
    <div className="container">
      <h1>Video Player</h1>
      <p>Video ID: {videoId}</p>
      <GrpcDashPlayer videoId={videoId} />

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: #000;
          padding: 20px;
        }

        h1 {
          color: #fff;
          text-align: center;
          margin-bottom: 10px;
        }

        p {
          color: #999;
          text-align: center;
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
}
