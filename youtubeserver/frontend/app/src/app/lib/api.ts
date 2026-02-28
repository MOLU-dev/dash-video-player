import { API_BASE_URL } from "@/utils/constants";
import type { StreamConfig, StreamMetadata, StreamHealth } from "./types";

export class StreamAPI {
  static async createStream(title: string): Promise<StreamConfig> {
    const response = await fetch(`${API_BASE_URL}/api/streams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error("Failed to create stream");
    }

    return response.json();
  }

  static async getStream(streamId: string): Promise<StreamMetadata> {
    const response = await fetch(`${API_BASE_URL}/api/streams/${streamId}`);

    if (!response.ok) {
      throw new Error("Stream not found");
    }

    return response.json();
  }

  static async listStreams(): Promise<StreamMetadata[]> {
    const response = await fetch(`${API_BASE_URL}/api/streams`);

    if (!response.ok) {
      throw new Error("Failed to fetch streams");
    }

    return response.json();
  }

  static async getStreamHealth(streamId: string): Promise<StreamHealth> {
    const response = await fetch(
      `${API_BASE_URL}/api/streams/${streamId}/health`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch stream health");
    }

    return response.json();
  }

  static async deleteStream(resourceUrl: string): Promise<void> {
    await fetch(`${API_BASE_URL}${resourceUrl}`, {
      method: "DELETE",
    });
  }
}
