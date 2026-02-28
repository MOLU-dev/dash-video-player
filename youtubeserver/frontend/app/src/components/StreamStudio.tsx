"use client";

import { useState, useRef, useEffect } from "react";

interface StreamConfig {
  streamId: string;
  streamKey: string;
  whipUrl: string;
  playUrl: string;
}

export default function StreamStudio() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamConfig, setStreamConfig] = useState<StreamConfig | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [selectedMic, setSelectedMic] = useState<string>("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<string>("Ready");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const resourceUrlRef = useRef<string>("");

  // Get available media devices
  useEffect(() => {
    async function getDevices() {
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        setDevices(deviceList);

        const videoDevice = deviceList.find((d) => d.kind === "videoinput");
        const audioDevice = deviceList.find((d) => d.kind === "audioinput");

        if (videoDevice) setSelectedCamera(videoDevice.deviceId);
        if (audioDevice) setSelectedMic(audioDevice.deviceId);
      } catch (err) {
        setError("Failed to get media devices");
      }
    }
    getDevices();
  }, []);

  // Create a new stream on the server
  const createStream = async (title: string) => {
    try {
      const response = await fetch("http://localhost:8080/api/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) throw new Error("Failed to create stream");

      const config = await response.json();
      setStreamConfig(config);
      return config;
    } catch (err) {
      setError("Failed to create stream");
      throw err;
    }
  };

  // Start capturing media
  const startCapture = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: {
          deviceId: selectedMic ? { exact: selectedMic } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      return stream;
    } catch (err) {
      setError("Failed to access camera/microphone");
      throw err;
    }
  };

  // Start streaming via WHIP
  const startStreaming = async () => {
    try {
      setStatus("Creating stream...");

      // Create stream on server
      const config = await createStream(
        `Stream ${new Date().toLocaleString()}`
      );

      setStatus("Accessing camera...");

      // Get media stream
      const stream = await startCapture();

      setStatus("Connecting to server...");

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      peerConnectionRef.current = pc;

      // Add tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle connection state
      pc.onconnectionstatechange = () => {
        console.log("Connection state:", pc.connectionState);
        setStatus(`Connection: ${pc.connectionState}`);

        if (pc.connectionState === "connected") {
          setIsStreaming(true);
          setStatus("🔴 Live");
        } else if (pc.connectionState === "failed") {
          setStatus("Connection failed");
          stopStreaming();
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("ICE candidate:", event.candidate);
        }
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send WHIP request
      const response = await fetch(config.whip_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
          Authorization: `Bearer ${config.stream_key}`,
        },
        body: offer.sdp,
      });

      if (!response.ok) {
        throw new Error("WHIP request failed");
      }

      // Get resource URL from Location header
      const locationHeader = response.headers.get("Location");
      if (locationHeader) {
        resourceUrlRef.current = locationHeader;
      }

      // Set remote description from answer
      const answerSdp = await response.text();
      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });

      setStatus("🔴 Live");
      setIsStreaming(true);
    } catch (err) {
      console.error("Streaming error:", err);
      setError(`Streaming failed: ${err}`);
      stopStreaming();
    }
  };

  // Stop streaming
  const stopStreaming = async () => {
    try {
      // Send WHIP DELETE request
      if (resourceUrlRef.current && streamConfig) {
        await fetch(`http://localhost:8080${resourceUrlRef.current}`, {
          method: "DELETE",
        });
      }

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Clear video
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setIsStreaming(false);
      setStatus("Stream ended");
      resourceUrlRef.current = "";
    } catch (err) {
      console.error("Stop streaming error:", err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Live Stream Studio</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Preview */}
        <div className="lg:col-span-2">
          <div className="bg-black rounded-lg overflow-hidden aspect-video relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full"
            />
            {isStreaming && (
              <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full flex items-center gap-2">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                LIVE
              </div>
            )}
          </div>

          <div className="mt-4 text-center">
            <p className="text-lg font-medium">{status}</p>
            {streamConfig && isStreaming && (
              <p className="text-sm text-gray-600 mt-2">
                Viewers can watch at: {streamConfig.play_url}
              </p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Camera</label>
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              disabled={isStreaming}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {devices
                .filter((d) => d.kind === "videoinput")
                .map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Microphone</label>
            <select
              value={selectedMic}
              onChange={(e) => setSelectedMic(e.target.value)}
              disabled={isStreaming}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {devices
                .filter((d) => d.kind === "audioinput")
                .map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label ||
                      `Microphone ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
            </select>
          </div>

          <button
            onClick={isStreaming ? stopStreaming : startStreaming}
            className={`w-full py-3 rounded-lg font-semibold text-white ${
              isStreaming
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isStreaming ? "Stop Streaming" : "Start Streaming"}
          </button>

          {streamConfig && (
            <div className="bg-gray-100 p-4 rounded-lg text-sm">
              <p className="font-medium mb-2">Stream Info</p>
              <p className="text-xs text-gray-600 break-all">
                Stream ID: {streamConfig.streamId}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// Add to StreamStudio component

const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
const [isScreenSharing, setIsScreenSharing] = useState(false)

const startScreenShare = async () => {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 }
      },
      audio: true // Include system audio
    })

    setScreenStream(screenStream)
    setIsScreenSharing(true)

    // Replace video track in peer connection
    if (peerConnectionRef.current && streamRef.current) {
      const videoTrack = screenStream.getVideoTracks()[0]
      const sender = peerConnectionRef.current
        .getSenders()
        .find(s => s.track?.kind === 'video')
      
      if (sender) {
        await sender.replaceTrack(videoTrack)
      }

      // Update preview
      if (videoRef.current) {
        videoRef.current.srcObject = screenStream
      }
    }

    // Handle when user stops sharing via browser UI
    screenStream.getVideoTracks()[0].onended = () => {
      stopScreenShare()
    }
  } catch (err) {
    console.error('Screen share error:', err)
    setError('Failed to share screen')
  }
}

const stopScreenShare = async () => {
  if (screenStream) {
    screenStream.getTracks().forEach(track => track.stop())
  }

  // Switch back to camera
  if (peerConnectionRef.current && streamRef.current) {
    const videoTrack = streamRef.current.getVideoTracks()[0]
    const sender = peerConnectionRef.current
      .getSenders()
      .find(s => s.track?.kind === 'video')
    
    if (sender && videoTrack) {
      await sender.replaceTrack(videoTrack)
    }

    if (videoRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }

  setScreenStream(null)
  setIsScreenSharing(false)
}

// Add button in UI:
<button
  onClick={isScreenSharing ? stopScreenShare : startScreenShare}
  disabled={!isStreaming}
  className="w-full py-2 rounded-lg bg-purple-600 text-white disabled:bg-gray-300"
>
  {isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
</button>

const [streamSettings, setStreamSettings] = useState({
  resolution: "1080p",
  framerate: 30,
  bitrate: 2500,
});

const applyStreamSettings = async () => {
  if (!streamRef.current) return;

  const videoTrack = streamRef.current.getVideoTracks()[0];

  const resolutions: Record<string, { width: number; height: number }> = {
    "1080p": { width: 1920, height: 1080 },
    "720p": { width: 1280, height: 720 },
    "480p": { width: 854, height: 480 },
  };

  const constraints = {
    ...resolutions[streamSettings.resolution],
    frameRate: streamSettings.framerate,
  };

  await videoTrack.applyConstraints(constraints);
};

// Add in UI:
<div className="space-y-3">
  <div>
    <label className="block text-sm font-medium mb-1">Resolution</label>
    <select
      value={streamSettings.resolution}
      onChange={(e) =>
        setStreamSettings({ ...streamSettings, resolution: e.target.value })
      }
      className="w-full px-3 py-2 border rounded"
    >
      <option value="1080p">1080p (1920x1080)</option>
      <option value="720p">720p (1280x720)</option>
      <option value="480p">480p (854x480)</option>
    </select>
  </div>

  <div>
    <label className="block text-sm font-medium mb-1">Frame Rate</label>
    <select
      value={streamSettings.framerate}
      onChange={(e) =>
        setStreamSettings({
          ...streamSettings,
          framerate: Number(e.target.value),
        })
      }
      className="w-full px-3 py-2 border rounded"
    >
      <option value="60">60 FPS</option>
      <option value="30">30 FPS</option>
      <option value="24">24 FPS</option>
    </select>
  </div>

  <button
    onClick={applyStreamSettings}
    disabled={!isStreaming}
    className="w-full py-2 rounded bg-gray-600 text-white"
  >
    Apply Settings
  </button>
</div>;