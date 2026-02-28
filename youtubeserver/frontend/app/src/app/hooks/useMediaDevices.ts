import { useState, useEffect } from "react";

export function useMediaDevices() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [selectedMic, setSelectedMic] = useState<string>("");

  useEffect(() => {
    async function getDevices() {
      try {
        // Request permissions first
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        const deviceList = await navigator.mediaDevices.enumerateDevices();
        setDevices(deviceList);

        const videoDevice = deviceList.find((d) => d.kind === "videoinput");
        const audioDevice = deviceList.find((d) => d.kind === "audioinput");

        if (videoDevice) setSelectedCamera(videoDevice.deviceId);
        if (audioDevice) setSelectedMic(audioDevice.deviceId);
      } catch (err) {
        console.error("Failed to get media devices:", err);
      }
    }

    getDevices();

    // Listen for device changes
    navigator.mediaDevices.addEventListener("devicechange", getDevices);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", getDevices);
    };
  }, []);

  const cameras = devices.filter((d) => d.kind === "videoinput");
  const microphones = devices.filter((d) => d.kind === "audioinput");

  return {
    cameras,
    microphones,
    selectedCamera,
    selectedMic,
    setSelectedCamera,
    setSelectedMic,
  };
}
