'use client'

import { useState, useRef } from 'react'
import { Monitor, MonitorOff, Share2 } from 'lucide-react'
import { StreamAPI } from '@/lib/api'
import { WHIPClient } from '@/lib/whip'
import { useMediaDevices } from '@/hooks/useMediaDevices'
import { useStreamHealth } from '@/hooks/useStreamHealth'
import { RESOLUTIONS } from '@/utils/constants'
import type { StreamConfig, StreamSettings } from '@/lib/types'

import VideoPreview from './VideoPreview'
import DeviceSelector from './DeviceSelector'
import StreamSettingsPanel from './StreamSettings'
import HealthMonitor from './HealthMonitor'

export default function StreamStudio() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamConfig, setStreamConfig] = useState<StreamConfig | null>(null)
  const [status, setStatus] = useState('Ready to stream')
  const [error, setError] = useState<string | null>(null)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  const [streamSettings, setStreamSettings] = useState<StreamSettings>({
    resolution: '1080p',
    framerate: 30,
    bitrate: 2500,
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const whipClientRef = useRef<WHIPClient | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)

  const {
    cameras,
    microphones,
    selectedCamera,
    selectedMic,
    setSelectedCamera,
    setSelectedMic,
  } = useMediaDevices()

  const { health } = useStreamHealth(streamConfig?.stream_id || null, isStreaming)

  const startCapture = async (): Promise<MediaStream> => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          width: { ideal: RESOLUTIONS[streamSettings.resolution].width },
          height: { ideal: RESOLUTIONS[streamSettings.resolution].height },
          frameRate: { ideal: streamSettings.framerate },
        },
        audio: {
          deviceId: selectedMic ? { exact: selectedMic } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      return stream
    } catch (err) {
      throw new Error('Failed to access camera/microphone')
    }
  }

  const startStreaming = async () => {
    try {
      setError(null)
      setStatus('Creating stream...')

      // Create stream on server
      const config = await StreamAPI.createStream(
        `Live Stream - ${new Date().toLocaleString()}`
      )
      setStreamConfig(config)

      setStatus('Accessing camera...')

      // Get media stream
      const stream = await startCapture()

      setStatus('Connecting to server...')

      // Initialize WHIP client
      const whipClient = new WHIPClient()
      whipClientRef.current = whipClient

      // Start streaming
      const pc = await whipClient.startStreaming(stream, config)
      peerConnectionRef.current = pc

      // Handle connection state
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState)

        if (pc.connectionState === 'connected') {
          setIsStreaming(true)
          setStatus('🔴 Live')
        } else if (pc.connectionState === 'failed') {
          setStatus('Connection failed')
          setError('Connection to server failed')
          stopStreaming()
        } else if (pc.connectionState === 'disconnected') {
          setStatus('Disconnected - Attempting to reconnect...')
        }
      }

      // Handle ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState)
      }

    } catch (err) {
      console.error('Streaming error:', err)
      setError(`Failed to start stream: ${err}`)
      setStatus('Error')
      stopStreaming()
    }
  }

  const stopStreaming = async () => {
    try {
      setStatus('Stopping stream...')

      // Stop WHIP client
      if (whipClientRef.current) {
        await whipClientRef.current.stopStreaming()
        whipClientRef.current = null
      }

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      // Stop screen share if active
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop())
        screenStreamRef.current = null
      }

      // Clear video
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }

      setIsStreaming(false)
      setIsScreenSharing(false)
      setStatus('Stream ended')
      setStreamConfig(null)
    } catch (err) {
      console.error('Stop streaming error:', err)
      setError('Failed to stop stream properly')
    }
  }

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      })

      screenStreamRef.current = screenStream
      setIsScreenSharing(true)

      // Replace video track
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
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop())
      screenStreamRef.current = null
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

    setIsScreenSharing(false)
  }

  const applyStreamSettings = async () => {
    if (!streamRef.current) return

    try {
      const videoTrack = streamRef.current.getVideoTracks()[0]
      const constraints = {
        width: { ideal: RESOLUTIONS[streamSettings.resolution].width },
        height: { ideal: RESOLUTIONS[streamSettings.resolution].height },
        frameRate: { ideal: streamSettings.framerate },
      }

      await videoTrack.applyConstraints(constraints)
      setStatus('Settings applied')
    } catch (err) {
      setError('Failed to apply settings')
    }
  }

  return (
    <div className="min-h-screen bg-youtube-black pt-14">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-white mb-6">Live Studio</h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Preview - Left Side */}
          <div className="lg:col-span-2 space-y-4">
            <VideoPreview ref={videoRef} isStreaming={isStreaming} status={status} />

            {/* Stream Info */}
            {streamConfig && isStreaming && (
              <div className="bg-youtube-dark border border-youtube-border rounded-lg p-4">
                <h3 className="font-semibold text-white mb-3">Stream Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-youtube-textSecondary">Stream ID:</span>
                    <span className="text-white font-mono">{streamConfig.stream_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-youtube-textSecondary">Watch URL:</span>
                    
                      href={`/watch/${streamConfig.stream_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-youtube-red hover:underline"
                    >
                      View Stream
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Health Monitor */}
            {isStreaming && <HealthMonitor health={health} />}
          </div>

          {/* Control Panel - Right Side */}
          <div className="space-y-4">
            {/* Device Selection */}
            <div className="bg-youtube-dark border border-youtube-border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-white text-lg">Devices</h3>

              <DeviceSelector
                label="Camera"
                devices={cameras}
                selectedDevice={selectedCamera}
                onDeviceChange={setSelectedCamera}
                disabled={isStreaming}
              />

              <DeviceSelector
                label="Microphone"
                devices={microphones}
                selectedDevice={selectedMic}
                onDeviceChange={setSelectedMic}
                disabled={isStreaming}
              />
            </div>

            {/* Stream Settings */}
            <StreamSettingsPanel
              settings={streamSettings}
              onSettingsChange={setStreamSettings}
              onApply={applyStreamSettings}
              disabled={!isStreaming}
            />

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={isStreaming ? stopStreaming : startStreaming}
                className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
                  isStreaming
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-youtube-red hover:bg-red-600'
                }`}
              >
                {isStreaming ? 'Stop Streaming' : 'Start Streaming'}
              </button>

              <button
                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                disabled={!isStreaming}
                className="w-full py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isScreenSharing ? (
                  <>
                    <MonitorOff size={20} />
                    Stop Screen Share
                  </>
                ) : (
                  <>
                    <Monitor size={20} />
                    Share Screen
                  </>
                )}
              </button>

              {streamConfig && isStreaming && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/watch/${streamConfig.stream_id}`
                    )
                  }}
                  className="w-full py-3 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 size={20} />
                  Copy Stream Link
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}