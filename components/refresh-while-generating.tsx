"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface RefreshWhileGeneratingProps {
  hasPendingImages: boolean;
  intervalMs?: number;
}

export function RefreshWhileGenerating({
  hasPendingImages,
  intervalMs = 5000,
}: RefreshWhileGeneratingProps) {
  const router = useRouter();

  useEffect(() => {
    if (!hasPendingImages) return;

    const interval = setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [hasPendingImages, intervalMs, router]);

  return null;
}
