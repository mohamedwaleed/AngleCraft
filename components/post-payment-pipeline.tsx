"use client";

import { useState, useEffect } from "react";
import { StatusPipeline, type PipelineStep } from "@/components/status-pipeline";
import type { SessionStatus } from "@/lib/types";

const POST_PAYMENT_STEPS: PipelineStep[] = [
  {
    id: "concepts",
    label: "Generating concepts",
    description: "Turning your top angles into creative concepts.",
    activeStatuses: ["paid"],
    completeStatuses: ["generating", "complete"],
    triggerEndpoint: "/api/concepts",
  },
  {
    id: "creatives",
    label: "Generating creatives",
    description: "Writing copy and generating images for each concept.",
    activeStatuses: ["generating"],
    completeStatuses: ["complete"],
    triggerEndpoint: "/api/creatives",
  },
  {
    id: "testing-plan",
    label: "Building testing plan",
    description: "Assembling a Meta/TikTok testing plan.",
    activeStatuses: ["generating"],
    completeStatuses: ["complete"],
    triggerEndpoint: "/api/testing-plan",
  },
];

interface PostPaymentPipelineProps {
  initialStatus: SessionStatus;
}

export function PostPaymentPipeline({ initialStatus }: PostPaymentPipelineProps) {
  const [imagesReady, setImagesReady] = useState(false);
  const [pipelineKey] = useState(0);

  // Poll for image generation completion.
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/session-status");
        if (!res.ok) return;
        const data = await res.json();
        const imageStatuses: string[] = data?.imageStatuses ?? [];
        if (
          imageStatuses.length > 0 &&
          imageStatuses.every((s) => s === "complete")
        ) {
          if (!cancelled) {
            setImagesReady(true);
          }
        }
      } catch (err) {
        console.error("image poll failed:", err);
      }
    };

    // Poll immediately and then every 5s.
    void poll();
    const interval = setInterval(poll, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // If images are ready and we're in the generating phase, the creatives
  // step is effectively done. The testing plan step can proceed.
  // We force a remount of StatusPipeline when images become ready to
  // re-evaluate the step states.
  if (imagesReady) {
    // Update steps so the creatives step is considered complete when images are ready.
    const updatedSteps: PipelineStep[] = POST_PAYMENT_STEPS.map((step) => {
      if (step.id === "creatives") {
        return {
          ...step,
          // When images are ready, treat the generating status as "complete"
          // for the creatives step, allowing the testing plan step to become active.
          completeStatuses: ["generating", "complete"],
        };
      }
      return step;
    });

    return (
      <StatusPipeline
        key={`images-ready-${pipelineKey}`}
        steps={updatedSteps}
        initialStatus={initialStatus}
        onCompleteHref="/results"
      />
    );
  }

  return (
    <StatusPipeline
      key={`waiting-images-${pipelineKey}`}
      steps={POST_PAYMENT_STEPS}
      initialStatus={initialStatus}
      onCompleteHref="/results"
    />
  );
}
