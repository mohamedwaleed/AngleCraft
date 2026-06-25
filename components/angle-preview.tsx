"use client";

import { useState } from "react";
import { Check, Copy, RefreshCw, Sparkles, Trophy, ArrowRight } from "lucide-react";
import type { AngleLabel } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AngleItem {
  id: string;
  angleLabel: AngleLabel;
  hook: string;
  score: number;
  isSelected: boolean;
}

const LABEL_DISPLAY: Record<AngleLabel, string> = {
  convenience: "Convenience",
  time_saving: "Time Saving",
  pain_point: "Pain Point",
  healthy_lifestyle: "Healthy Lifestyle",
  perfect_gift: "Perfect Gift",
};

const LABEL_ACCENT: Record<AngleLabel, { bg: string; fg: string; border: string; iconBg: string; icon: string }> = {
  convenience: { bg: "bg-emerald-50", fg: "text-emerald-700", border: "border-emerald-200", iconBg: "bg-emerald-500", icon: "text-emerald-500" },
  time_saving: { bg: "bg-blue-50", fg: "text-blue-700", border: "border-blue-200", iconBg: "bg-blue-500", icon: "text-blue-500" },
  pain_point: { bg: "bg-amber-50", fg: "text-amber-700", border: "border-amber-200", iconBg: "bg-amber-500", icon: "text-amber-500" },
  healthy_lifestyle: { bg: "bg-violet-50", fg: "text-violet-700", border: "border-violet-200", iconBg: "bg-violet-500", icon: "text-violet-500" },
  perfect_gift: { bg: "bg-rose-50", fg: "text-rose-700", border: "border-rose-200", iconBg: "bg-rose-500", icon: "text-rose-500" },
};

const LABEL_ICON: Record<AngleLabel, string> = {
  convenience: "⚡",
  time_saving: "⏱️",
  pain_point: "😫",
  healthy_lifestyle: "❤️",
  perfect_gift: "🎁",
};

function CopyHookButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("copy failed:", err);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-semibold text-[#64748B] transition-all hover:border-[#CBD5E1] hover:text-[#0F172A] hover:shadow-sm"
    >
      {copied ? (
        <>
          <Check className="size-3.5 text-emerald-500" />
          Copied
        </>
      ) : (
        <>
          <Copy className="size-3.5" />
          Copy
        </>
      )}
    </button>
  );
}

interface AnglePreviewProps {
  angles: AngleItem[];
  onRegenerate?: () => void;
  onNext?: () => void;
  regenerating?: boolean;
  hideActions?: boolean;
}

export function AnglePreview({ angles, onRegenerate, onNext, regenerating, hideActions }: AnglePreviewProps) {
  const sorted = [...angles].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2
            className="text-xl sm:text-2xl font-bold text-[#0F172A]"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
          >
            AI-Generated Ad Angles
          </h2>
          <p className="text-sm text-[#64748B] mt-1">
            Based on your product and market research.
          </p>
        </div>
        {!hideActions && onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenerating}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] transition-all hover:bg-[#F8FAFC] hover:border-[#CBD5E1] disabled:opacity-60 disabled:cursor-not-allowed self-start sm:self-auto"
          >
            {regenerating ? <RefreshCw className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Regenerate Angles
          </button>
        )}
      </div>

      {/* Angles grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {sorted.map((angle, i) => {
          const accent = LABEL_ACCENT[angle.angleLabel];
          return (
            <div
              key={angle.id}
              className={cn(
                "group relative flex flex-col rounded-2xl border bg-white p-5 transition-all hover:shadow-md",
                angle.isSelected ? `${accent.border} ring-1 ring-offset-0` : "border-[#E2E8F0]"
              )}
            >
              {/* Rank badge */}
              <div
                className={cn(
                  "absolute -top-3 -left-3 flex size-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm",
                  i === 0 ? "bg-indigo-600" : i === 1 ? "bg-indigo-500" : i === 2 ? "bg-indigo-400" : "bg-[#CBD5E1]"
                )}
              >
                {i + 1}
              </div>

              {/* Icon */}
              <div
                className={cn(
                  "mb-4 flex size-14 items-center justify-center rounded-2xl text-2xl",
                  accent.bg
                )}
              >
                {LABEL_ICON[angle.angleLabel]}
              </div>

              {/* Label */}
              <h3 className={cn("text-base font-bold", accent.fg)}>
                {LABEL_DISPLAY[angle.angleLabel]}
              </h3>

              {/* Hook */}
              <p className="mt-2 text-sm font-medium text-[#0F172A] leading-relaxed flex-1">
                &ldquo;{angle.hook}&rdquo;
              </p>

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Trophy className={cn("size-3.5", accent.icon)} />
                  <span className="text-xs font-bold text-[#64748B]">
                    {angle.score}
                    <span className="text-[#94A3B8] font-medium">/100</span>
                  </span>
                </div>
                <CopyHookButton text={angle.hook} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected hint */}
      <div className="flex items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 text-sm text-indigo-700">
        <Sparkles className="size-4 shrink-0" />
        <p>
          The top 3 angles are marked as <strong>Selected for your full campaign</strong>. After payment, we&apos;ll generate 3 ad concepts and creatives based on these winners.
        </p>
      </div>

      {/* Next action */}
      {!hideActions && onNext && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:shadow-indigo-600/30 hover:-translate-y-0.5"
          >
            Unlock Full Campaign
            <ArrowRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
