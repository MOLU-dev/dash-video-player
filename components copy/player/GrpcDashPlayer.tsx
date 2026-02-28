"use client";

import React from "react";
import { useGrpcPlayer } from "../../src/hooks";
import { GrpcDashPlayerUI } from "./GrpcDashPlayerUI";

interface GrpcDashPlayerProps {
  videoId: string;
}

export default function GrpcDashPlayer({ videoId }: GrpcDashPlayerProps) {
  // All logic is in the hook
  const playerState = useGrpcPlayer({ videoId });

  // Just pass everything to the UI component
  return <GrpcDashPlayerUI {...playerState} />;
}
