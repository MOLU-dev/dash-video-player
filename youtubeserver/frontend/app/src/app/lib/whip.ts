import { API_BASE_URL } from "@/utils/constants";
import type { StreamConfig } from "./types";

export class WHIPClient {
  private peerConnection: RTCPeerConnection | null = null;
  private resourceUrl: string = "";

  async startStreaming(
    stream: MediaStream,
    config: StreamConfig
  ): Promise<RTCPeerConnection> {
    // Create peer connection
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    this.peerConnection = pc;

    // Add tracks
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Create and set local description
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

    // Store resource URL
    const locationHeader = response.headers.get("Location");
    if (locationHeader) {
      this.resourceUrl = locationHeader;
    }

    // Set remote description
    const answerSdp = await response.text();
    await pc.setRemoteDescription({
      type: "answer",
      sdp: answerSdp,
    });

    return pc;
  }

  async stopStreaming(): Promise<void> {
    if (this.resourceUrl) {
      await fetch(`${API_BASE_URL}${this.resourceUrl}`, {
        method: "DELETE",
      });
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }

  getResourceUrl(): string {
    return this.resourceUrl;
  }
}
