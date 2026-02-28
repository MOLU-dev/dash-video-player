import Link from "next/link";
import { Eye, Circle } from "lucide-react";
import type { StreamMetadata } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

interface StreamCardProps {
  stream: StreamMetadata;
}

export default function StreamCard({ stream }: StreamCardProps) {
  const isLive = stream.status === "live";

  return (
    <Link href={`/watch/${stream.id}`} className="group">
      <div className="bg-youtube-dark rounded-lg overflow-hidden hover:bg-youtube-darkHover transition-colors">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-youtube-black">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl text-youtube-textSecondary">📹</div>
          </div>

          {isLive && (
            <div className="absolute top-2 left-2 bg-youtube-red text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
              <Circle size={8} fill="white" />
              LIVE
            </div>
          )}

          <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-0.5 rounded text-xs flex items-center gap-1">
            <Eye size={12} />
            {stream.viewer_count}
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="text-white font-medium line-clamp-2 group-hover:text-youtube-red transition-colors">
            {stream.title}
          </h3>

          <div className="mt-2 text-sm text-youtube-textSecondary">
            {isLive ? (
              <span>Streaming now</span>
            ) : (
              <span>
                {stream.start_time
                  ? formatDistanceToNow(new Date(stream.start_time), {
                      addSuffix: true,
                    })
                  : "Not started"}
              </span>
            )}
          </div>

          <div className="mt-1 text-xs text-youtube-textSecondary">
            Status: <span className="capitalize">{stream.status}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
