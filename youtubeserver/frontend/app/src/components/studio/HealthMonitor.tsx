import type { StreamHealth } from "@/lib/types";
import { Activity, Wifi, TrendingUp, Clock } from "lucide-react";

interface HealthMonitorProps {
  health: StreamHealth | null;
}

export default function HealthMonitor({ health }: HealthMonitorProps) {
  if (!health) return null;

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case "good":
        return "text-green-500";
      case "fair":
        return "text-yellow-500";
      case "poor":
        return "text-orange-500";
      default:
        return "text-red-500";
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="bg-youtube-dark border border-youtube-border rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-white text-lg flex items-center gap-2">
        <Activity size={20} />
        Stream Health
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-youtube-black rounded-lg p-3">
          <div className="flex items-center gap-2 text-youtube-textSecondary text-sm mb-1">
            <Wifi size={16} />
            <span>Quality</span>
          </div>
          <p
            className={`text-lg font-semibold ${getQualityColor(
              health.connection_quality
            )}`}
          >
            {health.connection_quality.toUpperCase()}
          </p>
        </div>

        <div className="bg-youtube-black rounded-lg p-3">
          <div className="flex items-center gap-2 text-youtube-textSecondary text-sm mb-1">
            <Activity size={16} />
            <span>Packet Loss</span>
          </div>
          <p className="text-lg font-semibold text-white">
            {health.packet_loss_percent.toFixed(2)}%
          </p>
        </div>

        <div className="bg-youtube-black rounded-lg p-3">
          <div className="flex items-center gap-2 text-youtube-textSecondary text-sm mb-1">
            <TrendingUp size={16} />
            <span>Bitrate</span>
          </div>
          <p className="text-lg font-semibold text-white">
            {(health.current_bitrate / 1000).toFixed(0)} kbps
          </p>
        </div>

        <div className="bg-youtube-black rounded-lg p-3">
          <div className="flex items-center gap-2 text-youtube-textSecondary text-sm mb-1">
            <Clock size={16} />
            <span>Uptime</span>
          </div>
          <p className="text-lg font-semibold text-white">
            {formatUptime(health.uptime_seconds)}
          </p>
        </div>
      </div>
    </div>
  );
}
