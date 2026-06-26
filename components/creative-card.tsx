"use client";

import Image from "next/image";
import { CopyButton } from "@/components/copy-button";
import type { AngleLabel, ImageStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ImageIcon, Loader2 } from "lucide-react";

interface CreativeData {
  id: string;
  angleLabel: AngleLabel;
  headline: string;
  primaryText: string;
  cta: string;
  imageStatus: ImageStatus;
  imageUrl?: string | null;
}

const LABEL_DISPLAY: Record<AngleLabel, string> = {
  convenience: "Convenience",
  time_saving: "Time Saving",
  pain_point: "Pain Point",
  healthy_lifestyle: "Healthy Lifestyle",
  perfect_gift: "Perfect Gift",
};

const LABEL_ACCENT: Record<AngleLabel, string> = {
  convenience: "text-emerald-700 border-emerald-200 bg-emerald-50",
  time_saving: "text-blue-700 border-blue-200 bg-blue-50",
  pain_point: "text-amber-700 border-amber-200 bg-amber-50",
  healthy_lifestyle: "text-violet-700 border-violet-200 bg-violet-50",
  perfect_gift: "text-rose-700 border-rose-200 bg-rose-50",
};

interface CreativeCardProps {
  creative: CreativeData;
  index: number;
}

export function CreativeCard({ creative, index }: CreativeCardProps) {
  const isImageLoading = creative.imageStatus === "pending" || creative.imageStatus === "processing";
  const isImageFailed = creative.imageStatus === "failed";

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
      {/* Image section */}
      <div className="relative aspect-square bg-[#F1F5F9] flex items-center justify-center overflow-hidden">
        {creative.imageUrl && !isImageLoading ? (
          <Image
            src={creative.imageUrl}
            alt={`Ad creative for ${LABEL_DISPLAY[creative.angleLabel]}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : isImageFailed ? (
          <div className="flex flex-col items-center gap-2 text-[#94A3B8]">
            <ImageIcon className="size-10" />
            <span className="text-xs font-medium">Image generation failed</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 text-indigo-400 animate-spin" />
            <span className="text-xs font-medium text-[#94A3B8]">
              Generating image...
            </span>
          </div>
        )}

        {/* Angle badge */}
        <div
          className={cn(
            "absolute top-3 left-3 rounded-full border px-3 py-1 text-xs font-bold",
            LABEL_ACCENT[creative.angleLabel]
          )}
        >
          {LABEL_DISPLAY[creative.angleLabel]}
        </div>

        {/* Creative number */}
        <div className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm">
          {index + 1}
        </div>
      </div>

      {/* Copy section */}
      <div className="p-5 space-y-4">
        {/* Headline */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
              Headline
            </span>
            <CopyButton text={creative.headline} />
          </div>
          <p className="text-sm font-bold text-[#0F172A] leading-snug">
            {creative.headline}
          </p>
        </div>

        {/* Primary Text */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
              Primary Text
            </span>
            <CopyButton text={creative.primaryText} />
          </div>
          <p className="text-sm text-[#475569] leading-relaxed">
            {creative.primaryText}
          </p>
        </div>

        {/* CTA */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
              CTA
            </span>
            <CopyButton text={creative.cta} />
          </div>
          <div className="inline-block rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700">
            {creative.cta}
          </div>
        </div>
      </div>
    </div>
  );
}
