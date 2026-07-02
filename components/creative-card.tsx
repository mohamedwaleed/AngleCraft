"use client";

import Image from "next/image";
import { CopyButton } from "@/components/copy-button";
import type { AngleLabel, ImageStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ImageIcon, Loader2, Monitor, Rocket } from "lucide-react";

interface CreativeData {
  id: string;
  creativeIndex?: number;
  angleLabel: AngleLabel;
  headline: string;
  primaryText: string;
  cta: string;
  imageStatus: ImageStatus;
  imageUrl?: string | null;
  placement?: string | null;
  aspectRatio?: string | null;
}

interface CreativeStrategyData {
  angleCategory: string;
  psychology: string;
  primaryPlacement: string;
  secondaryPlacement: string;
  testingPriority: number;
  bestUseCase: string;
  reasonToTest: string;
}

const LABEL_DISPLAY: Record<AngleLabel, string> = {
  pain_point: "Pain Point",
  convenience: "Convenience",
  time_saving: "Time Saving",
  gift: "Gift",
  lifestyle: "Lifestyle",
  emotional: "Emotional",
  educational: "Educational",
  social_proof: "Social Proof",
  fear: "Fear",
  aspiration: "Aspiration",
  status: "Status",
  transformation: "Transformation",
};

const LABEL_ACCENT: Record<AngleLabel, string> = {
  pain_point: "text-amber-700 border-amber-200 bg-amber-50",
  convenience: "text-emerald-700 border-emerald-200 bg-emerald-50",
  time_saving: "text-blue-700 border-blue-200 bg-blue-50",
  gift: "text-rose-700 border-rose-200 bg-rose-50",
  lifestyle: "text-violet-700 border-violet-200 bg-violet-50",
  emotional: "text-pink-700 border-pink-200 bg-pink-50",
  educational: "text-cyan-700 border-cyan-200 bg-cyan-50",
  social_proof: "text-teal-700 border-teal-200 bg-teal-50",
  fear: "text-red-700 border-red-200 bg-red-50",
  aspiration: "text-indigo-700 border-indigo-200 bg-indigo-50",
  status: "text-fuchsia-700 border-fuchsia-200 bg-fuchsia-50",
  transformation: "text-purple-700 border-purple-200 bg-purple-50",
};

interface CreativeCardProps {
  creative: CreativeData;
  strategy?: CreativeStrategyData;
  index: number;
}

export function CreativeCard({ creative, strategy, index }: CreativeCardProps) {
  const isImageLoading = creative.imageStatus === "pending" || creative.imageStatus === "processing";
  const isImageFailed = creative.imageStatus === "failed";

  const aspectClass =
    creative.aspectRatio === "9:16"
      ? "aspect-[9/16]"
      : creative.aspectRatio === "16:9"
        ? "aspect-[16/9]"
        : creative.aspectRatio === "4:5"
          ? "aspect-[4/5]"
          : "aspect-square";

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
      {/* Image section */}
      <div className={cn("relative bg-[#F1F5F9] flex items-center justify-center overflow-hidden", aspectClass)}>
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

        {/* Placement badge */}
        {strategy?.primaryPlacement && (
          <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-sm px-2.5 py-1 text-xs font-medium text-white w-fit">
              <Monitor className="size-3" />
              Designed for {strategy.primaryPlacement}
            </div>
            {strategy.secondaryPlacement && (
              <div className="text-[10px] font-medium text-white/90 px-1">
                Can also be tested on {strategy.secondaryPlacement}
              </div>
            )}
          </div>
        )}

        {/* Creative number */}
        <div className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm">
          {index + 1}
        </div>
      </div>

      {/* Copy section */}
      <div className="p-5 space-y-4">
        {/* Ready to test badge */}
        <div className="flex items-start gap-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/70 px-3.5 py-2.5 shadow-sm">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
            <Rocket className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-emerald-900 leading-tight">
              Ready to Test
            </p>
            <p className="text-[11px] text-emerald-700 leading-snug mt-0.5">
              Designed to be uploaded directly to Meta Ads Manager as your first testing sprint.
            </p>
          </div>
        </div>

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

        {/* Strategy metadata */}
        {strategy && (
          <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Angle
                </span>
                <p className="text-xs font-medium text-[#0F172A]">{strategy.angleCategory}</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Testing Role
                </span>
                <p className="text-xs font-medium text-[#0F172A]">
                  {strategy.testingPriority === 1
                    ? "Primary Test Angle"
                    : strategy.testingPriority === 2
                      ? "Secondary Test Angle"
                      : "Exploration Angle"}
                </p>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                Psychology
              </span>
              <p className="text-xs text-[#475569]">{strategy.psychology}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Designed for
                </span>
                <p className="text-xs text-[#475569]">{strategy.primaryPlacement}</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Can also be tested on
                </span>
                <p className="text-xs text-[#475569]">{strategy.secondaryPlacement}</p>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                Best Use Case
              </span>
              <p className="text-xs font-medium text-[#0F172A]">{strategy.bestUseCase}</p>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                Reason To Test
              </span>
              <p className="text-xs text-[#475569]">{strategy.reasonToTest}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
