interface DeviceSelectorProps {
  label: string;
  devices: MediaDeviceInfo[];
  selectedDevice: string;
  onDeviceChange: (deviceId: string) => void;
  disabled?: boolean;
}

export default function DeviceSelector({
  label,
  devices,
  selectedDevice,
  onDeviceChange,
  disabled = false,
}: DeviceSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-youtube-textSecondary mb-2">
        {label}
      </label>
      <select
        value={selectedDevice}
        onChange={(e) => onDeviceChange(e.target.value)}
        disabled={disabled}
        className="w-full bg-youtube-dark border border-youtube-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-youtube-red disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `${label} ${device.deviceId.slice(0, 8)}`}
          </option>
        ))}
      </select>
    </div>
  );
}
