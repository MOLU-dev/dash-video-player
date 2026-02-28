import type { StreamSettings } from "@/lib/types";
import { FRAME_RATES } from "@/utils/constants";

interface StreamSettingsProps {
  settings: StreamSettings;
  onSettingsChange: (settings: StreamSettings) => void;
  onApply: () => void;
  disabled?: boolean;
}

export default function StreamSettingsPanel({
  settings,
  onSettingsChange,
  onApply,
  disabled = false,
}: StreamSettingsProps) {
  return (
    <div className="bg-youtube-dark border border-youtube-border rounded-lg p-4 space-y-4">
      <h3 className="font-semibold text-white text-lg">Stream Settings</h3>

      <div>
        <label className="block text-sm font-medium text-youtube-textSecondary mb-2">
          Resolution
        </label>
        <select
          value={settings.resolution}
          onChange={(e) =>
            onSettingsChange({ ...settings, resolution: e.target.value as any })
          }
          className="w-full bg-youtube-black border border-youtube-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-youtube-red"
        >
          <option value="1080p">1080p (1920x1080)</option>
          <option value="720p">720p (1280x720)</option>
          <option value="480p">480p (854x480)</option>
          <option value="360p">360p (640x360)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-youtube-textSecondary mb-2">
          Frame Rate
        </label>
        <select
          value={settings.framerate}
          onChange={(e) =>
            onSettingsChange({
              ...settings,
              framerate: Number(e.target.value) as any,
            })
          }
          className="w-full bg-youtube-black border border-youtube-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-youtube-red"
        >
          {FRAME_RATES.map((fps) => (
            <option key={fps} value={fps}>
              {fps} FPS
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={onApply}
        disabled={disabled}
        className="w-full bg-youtube-red hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
      >
        Apply Settings
      </button>
    </div>
  );
}
