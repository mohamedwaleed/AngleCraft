"use client";

import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  id: string;
  number: number;
  label: string;
  description: string;
}

interface StepsIndicatorProps {
  steps: Step[];
  currentStepId: string;
  className?: string;
}

export function StepsIndicator({ steps, currentStepId, className }: StepsIndicatorProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStepId);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between gap-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = step.id === currentStepId;
          const isUpcoming = index > currentIndex;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2">
                {/* Number bubble */}
                <div
                  className={cn(
                    "flex items-center justify-center size-9 rounded-full text-sm font-bold transition-all border-2",
                    isCompleted && "bg-indigo-600 border-indigo-600 text-white",
                    isCurrent && "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/25",
                    isUpcoming && "bg-white border-[#CBD5E1] text-[#64748B]"
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-5" strokeWidth={2.5} />
                  ) : isCurrent ? (
                    <Sparkles className="size-4" />
                  ) : (
                    step.number
                  )}
                </div>

                {/* Label */}
                <div className="text-center">
                  <p
                    className={cn(
                      "text-sm font-bold leading-tight",
                      isCompleted || isCurrent ? "text-[#0F172A]" : "text-[#94A3B8]"
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-[11px] text-[#64748B] leading-tight mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-3 mb-6">
                  <div
                    className={cn(
                      "h-0.5 rounded-full transition-all",
                      isCompleted ? "bg-indigo-600" : "bg-[#E2E8F0]"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
