"use client";

import { useState, useEffect, useRef } from "react";
import { StatusPipeline, type PipelineStep } from "@/components/status-pipeline";
import { trackMetaEvent } from "@/lib/meta";
import type { SessionStatus } from "@/lib/types";
import { Clock } from "lucide-react";

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
    description: "Writing copy and queuing image generation for each concept.",
    activeStatuses: ["generating"],
    completeStatuses: ["complete"],
    triggerEndpoint: "/api/creatives",
  },
  {
    id: "testing-plan",
    label: "Building testing plan",
    description: "Assembling a Meta Ads testing plan.",
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
  const [currentStatus, setCurrentStatus] = useState<SessionStatus>(initialStatus);
  const purchaseTracked = useRef(false);

  useEffect(() => {
    if (
      !purchaseTracked.current &&
      (initialStatus === "paid" || initialStatus === "generating")
    ) {
      purchaseTracked.current = true;
      trackMetaEvent("Purchase", {
        value: 4.99,
        currency: "USD",
        content_type: "product",
      });
    }
  }, [initialStatus]);

  // Poll for image generation completion so we can show a reassurance banner.
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/session-status");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.status) {
          setCurrentStatus(data.status as SessionStatus);
        }
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

    void poll();
    const interval = setInterval(poll, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const isGeneratingImages =
    currentStatus === "generating" ||
    (currentStatus === "complete" && !imagesReady);

  return (
    <div className="flex flex-col gap-4">
      {isGeneratingImages && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Clock className="size-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Creative images are still being generated
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Your copy and testing plan are ready. The ad images are generated
              in the background and typically take 1-2 minutes per creative.
              You can view your results now; the images will appear as soon as
              they&apos;re ready.
            </p>
          </div>
        </div>
      )}
      <StatusPipeline
        steps={POST_PAYMENT_STEPS}
        initialStatus={initialStatus}
        onCompleteHref="/results"
      />
    </div>
  );
}
