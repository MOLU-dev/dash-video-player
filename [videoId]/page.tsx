// // app/[videoId]/page.tsx
// "use client";
// import GrpcDashPlayer from "@/components/player/GrpcDashPlayer";
// import { use } from "react";

// export default function VideoPage({
//   params,
// }: {
//   params: Promise<{ videoId: string }>;
// }) {
//   // Unwrap the params promise
//   const { videoId } = use(params);

//   return (
//     <div className="container">
//       <h1>Video Player</h1>
//       <GrpcDashPlayer videoId={videoId} />
//     </div>
//   );
// }

// app/video/[videoId]/page.tsx
"use client";

import { use } from "react";
import GrpcDashPlayer from "../src/components/player/GrpcDashPlayer";

export default function VideoPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = use(params);

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
