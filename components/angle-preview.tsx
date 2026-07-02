"use client";

import { useState } from "react";
import { Check, Copy, RefreshCw, Sparkles, Trophy, ArrowRight } from "lucide-react";
import type { AngleLabel } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AngleItem {
  id: string;
  angleLabel: AngleLabel;
  angleName: string;
  buyerEmotion: string;
  purchaseMotivation: string;
  psychologicalTrigger: string;
  problemSolved: string;
  idealAudience: string;
  useCase: string;
  exampleHook: string;
  rationale: string;
  score: number;
  isSelected: boolean;
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

const LABEL_ACCENT: Record<AngleLabel, { bg: string; fg: string; border: string; icon: string }> = {
  pain_point: { bg: "bg-amber-50", fg: "text-amber-700", border: "border-amber-200", icon: "text-amber-500" },
  convenience: { bg: "bg-emerald-50", fg: "text-emerald-700", border: "border-emerald-200", icon: "text-emerald-500" },
  time_saving: { bg: "bg-blue-50", fg: "text-blue-700", border: "border-blue-200", icon: "text-blue-500" },
  gift: { bg: "bg-rose-50", fg: "text-rose-700", border: "border-rose-200", icon: "text-rose-500" },
  lifestyle: { bg: "bg-violet-50", fg: "text-violet-700", border: "border-violet-200", icon: "text-violet-500" },
  emotional: { bg: "bg-pink-50", fg: "text-pink-700", border: "border-pink-200", icon: "text-pink-500" },
  educational: { bg: "bg-cyan-50", fg: "text-cyan-700", border: "border-cyan-200", icon: "text-cyan-500" },
  social_proof: { bg: "bg-teal-50", fg: "text-teal-700", border: "border-teal-200", icon: "text-teal-500" },
  fear: { bg: "bg-red-50", fg: "text-red-700", border: "border-red-200", icon: "text-red-500" },
  aspiration: { bg: "bg-indigo-50", fg: "text-indigo-700", border: "border-indigo-200", icon: "text-indigo-500" },
  status: { bg: "bg-fuchsia-50", fg: "text-fuchsia-700", border: "border-fuchsia-200", icon: "text-fuchsia-500" },
  transformation: { bg: "bg-purple-50", fg: "text-purple-700", border: "border-purple-200", icon: "text-purple-500" },
};

const LABEL_ICON: Record<AngleLabel, string> = {
  pain_point: "😫",
  convenience: "⚡",
  time_saving: "⏱️",
  gift: "🎁",
  lifestyle: "🌿",
  emotional: "❤️",
  educational: "📚",
  social_proof: "⭐",
  fear: "⚠️",
  aspiration: "✨",
  status: "👑",
  transformation: "🦋",
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

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
        {label}
      </span>
      <p className="text-xs text-[#475569] leading-snug">{value}</p>
    </div>
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
            Ad Angles
          </h2>
          <p className="text-sm text-[#64748B] mt-1">
            Five predefined buyer-psychology angles, scored and ranked by purchase intent, audience reach, creative potential, and emotional strength.
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

              {angle.isSelected && (
                <div className="absolute -top-3 right-4 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  Selected
                </div>
              )}

              {/* Icon + title */}
              <div className="flex items-start gap-3 mb-4">
                <div
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl",
                    accent.bg
                  )}
                >
                  {LABEL_ICON[angle.angleLabel]}
                </div>
                <div>
                  <h3 className={cn("text-base font-bold", accent.fg)}>
                    {angle.angleName || LABEL_DISPLAY[angle.angleLabel]}
                  </h3>
                  <p className="text-xs text-[#94A3B8]">{LABEL_DISPLAY[angle.angleLabel]}</p>
                </div>
              </div>

              {/* Example hook */}
              <div className="mb-4 rounded-xl bg-slate-50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                    Example Hook
                  </span>
                  <CopyHookButton text={angle.exampleHook} />
                </div>
                <p className="text-sm font-semibold text-[#0F172A] leading-snug">
                  &ldquo;{angle.exampleHook}&rdquo;
                </p>
              </div>

              {/* Buyer psychology */}
              <div className="space-y-2.5 mb-4">
                <Field label="Buyer Emotion" value={angle.buyerEmotion} />
                <Field label="Purchase Motivation" value={angle.purchaseMotivation} />
                <Field label="Psychological Trigger" value={angle.psychologicalTrigger} />
                <Field label="Problem Solved" value={angle.problemSolved} />
                <Field label="Ideal Audience" value={angle.idealAudience} />
                <Field label="Use Case" value={angle.useCase} />
              </div>

              {/* Rationale */}
              {angle.rationale && (
                <p className="text-xs text-[#64748B] leading-relaxed border-t border-slate-100 pt-3 mb-4">
                  <strong>Why it could work:</strong> {angle.rationale}
                </p>
              )}

              {/* Footer */}
              <div className="mt-auto flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Trophy className={cn("size-3.5", accent.icon)} />
                  <span className="text-xs font-bold text-[#64748B]">
                    {angle.score}
                    <span className="text-[#94A3B8] font-medium">/10</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected hint */}
      <div className="flex items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 text-sm text-indigo-700">
        <Sparkles className="size-4 shrink-0" />
        <p>
          The top 3 angles are marked as <strong>Selected for your full campaign</strong>. After payment, we&apos;ll generate 3 ready-to-run ad creatives based on these priority angles.
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
