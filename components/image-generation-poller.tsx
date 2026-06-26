"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2 } from "lucide-react";

interface ImageGenerationPollerProps {
  /** Callback when all images are complete. */
  onAllImagesReady: () => void;
  /** Polling interval in ms. */
  pollInterval?: number;
}

/**
 * Polls the session-status endpoint for image generation completion.
 * When all images are "complete", calls onAllImagesReady.
 * This component is used on the post-payment checkout page to ensure
 * the "Generating creatives" step doesn't advance until images are ready.
 */
export function ImageGenerationPoller({
  onAllImagesReady,
  pollInterval = 5000,
}: ImageGenerationPollerProps) {
  const [polling, setPolling] = useState(true);
  const callbackRef = useRef(onAllImagesReady);

  useEffect(() => {
    callbackRef.current = onAllImagesReady;
  });

  useEffect(() => {
    if (!polling) return;

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
            setPolling(false);
            callbackRef.current();
          }
        }
      } catch (err) {
        console.error("image poll failed:", err);
      }
    };

    void poll();
    const interval = setInterval(poll, pollInterval);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [polling, pollInterval]);

  if (!polling) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <Loader2 className="size-3.5 text-indigo-400 animate-spin" />
      <span className="text-xs text-[#64748B]">
        Waiting for images to generate...
      </span>
    </div>
  );
}
