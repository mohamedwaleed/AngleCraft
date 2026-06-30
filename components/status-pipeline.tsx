"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Circle, AlertCircle, RotateCw } from "lucide-react";
import type { SessionStatus } from "@/lib/types";

export type StepState = "pending" | "in_progress" | "complete" | "failed";

export interface PipelineStep {
  /** Stable id for the step. */
  id: string;
  /** Human-readable label shown to the user. */
  label: string;
  /** Short helper text under the label. */
  description?: string;
  /**
   * Session statuses that mark this step as in-progress. When the polled
   * session status matches one of these, the step renders as in_progress.
   */
  activeStatuses: SessionStatus[];
  /**
   * Session statuses that mark this step as complete. When the polled
   * session status matches one of these, the step renders as complete.
   */
  completeStatuses: SessionStatus[];
  /**
   * Optional API endpoint to trigger when the step becomes active and has
   * not yet been triggered. If omitted, the step only reacts to status changes.
   */
  triggerEndpoint?: string;
}

interface StatusPipelineProps {
  steps: PipelineStep[];
  /** Initial session status (from the Server Component). */
  initialStatus: SessionStatus;
  /** Where to navigate once the pipeline is fully complete. */
  onCompleteHref: string;
  /** Polling endpoint that returns `{ status: SessionStatus }`. Defaults to /api/session-status. */
  pollEndpoint?: string;
}

function statusForStep(
  step: PipelineStep,
  current: SessionStatus,
  stepIndex: number,
  steps: PipelineStep[],
  failed: string | null,
  completedAfterTrigger: string[]
): StepState {
  if (failed === step.id) return "failed";
  if (completedAfterTrigger.includes(step.id)) return "complete";
  if (step.completeStatuses.includes(current)) return "complete";
  if (step.activeStatuses.includes(current)) return "in_progress";

  // If a later step is already complete/in-progress, this earlier one is complete.
  for (let i = stepIndex + 1; i < steps.length; i++) {
    const later = steps[i];
    if (
      later.completeStatuses.includes(current) ||
      later.activeStatuses.includes(current)
    ) {
      return "complete";
    }
  }
  return "pending";
}

function pipelineComplete(steps: PipelineStep[], current: SessionStatus): boolean {
  return steps[steps.length - 1].completeStatuses.includes(current);
}

export function StatusPipeline({
  steps,
  initialStatus,
  onCompleteHref,
  pollEndpoint = "/api/session-status",
}: StatusPipelineProps) {
  const router = useRouter();
  const [status, setStatus] = useState<SessionStatus>(initialStatus);
  const [failedStep, setFailedStep] = useState<string | null>(null);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [completedAfterTrigger, setCompletedAfterTrigger] = useState<string[]>([]);
  const triggeredRef = useRef<Set<string>>(new Set());

  // Determine the currently-active step index.
  // A step is no longer active once it has been marked complete after a
  // successful endpoint trigger, even if the session status has not changed.
  const activeIndex = steps.findIndex(
    (s) =>
      s.activeStatuses.includes(status) &&
      !s.completeStatuses.includes(status) &&
      !completedAfterTrigger.includes(s.id)
  );

  // Trigger the active step's endpoint once. The triggering state is tracked
  // in a ref to avoid calling setState synchronously inside the effect body
  // (which would cause cascading renders). The `triggering` state is only
  // updated inside async callbacks.
  useEffect(() => {
    if (activeIndex === -1) return;
    const step = steps[activeIndex];
    if (!step.triggerEndpoint) return;
    if (triggeredRef.current.has(step.id)) return;
    if (failedStep === step.id) return;

    let cancelled = false;
    triggeredRef.current.add(step.id);

    const run = async () => {
      try {
        if (!cancelled) setTriggering(step.id);
        const res = await fetch(step.triggerEndpoint as string, { method: "POST" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `Request failed (${res.status})`);
        }
        // Mark this step as complete once its endpoint returned successfully.
        // This lets the pipeline advance even when the session status does not
        // change (e.g. creatives stay in "generating" while images generate async).
        if (!cancelled) {
          setCompletedAfterTrigger((prev) =>
            prev.includes(step.id) ? prev : [...prev, step.id]
          );
        }
        // Refresh status from the poll endpoint immediately.
        const pollRes = await fetch(pollEndpoint);
        const pollData = await pollRes.json();
        if (!cancelled && pollData?.status) {
          setStatus(pollData.status as SessionStatus);
        }
      } catch (err) {
        console.error(`step "${step.id}" trigger failed:`, err);
        if (!cancelled) setFailedStep(step.id);
      } finally {
        if (!cancelled) setTriggering(null);
      }
    };
    void run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, failedStep]);

  // Poll the session status while the pipeline is not complete and not failed.
  useEffect(() => {
    if (pipelineComplete(steps, status)) return;
    if (failedStep) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(pollEndpoint);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.status) {
          const next = data.status as SessionStatus;
          setStatus(next);
          if (next === "failed") {
            // Mark the active step as failed.
            const idx = steps.findIndex((s) => s.activeStatuses.includes("failed") || s.activeStatuses.includes(status));
            setFailedStep(steps[idx]?.id ?? steps[0].id);
          }
        }
      } catch (err) {
        console.error("status poll failed:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [steps, status, failedStep, pollEndpoint]);

  // Navigate when the pipeline is complete.
  useEffect(() => {
    if (pipelineComplete(steps, status)) {
      const t = setTimeout(() => router.push(onCompleteHref), 800);
      return () => clearTimeout(t);
    }
  }, [steps, status, onCompleteHref, router]);

  const retry = useCallback(async () => {
    if (!failedStep) return;
    const step = steps.find((s) => s.id === failedStep);
    if (!step) return;
    setFailedStep(null);
    triggeredRef.current.delete(step.id);
    setCompletedAfterTrigger((prev) => prev.filter((id) => id !== step.id));
    // Re-run the trigger effect by nudging status if needed.
    if (step.triggerEndpoint) {
      setTriggering(step.id);
      try {
        const res = await fetch(step.triggerEndpoint, { method: "POST" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `Retry failed (${res.status})`);
        }
        const pollRes = await fetch(pollEndpoint);
        const pollData = await pollRes.json();
        if (pollData?.status) setStatus(pollData.status as SessionStatus);
      } catch (err) {
        console.error(`retry of "${step.id}" failed:`, err);
        setFailedStep(step.id);
      } finally {
        setTriggering(null);
      }
    }
  }, [failedStep, steps, pollEndpoint]);

  const isComplete = pipelineComplete(steps, status);
  const progressValue = isComplete
    ? 100
    : (steps.filter((s) => statusForStep(s, status, steps.indexOf(s), steps, failedStep, completedAfterTrigger) === "complete").length /
        steps.length) *
      100;

  return (
    <div className="flex flex-col gap-6">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
            Progress
          </span>
          <span className="text-xs font-semibold text-indigo-600">
            {Math.round(progressValue)}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500 ease-out"
            style={{ width: `${progressValue}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <ol className="flex flex-col gap-3">
        {steps.map((step, i) => {
          const state = statusForStep(step, status, i, steps, failedStep, completedAfterTrigger);
          const isTriggering = triggering === step.id;
          return (
            <li
              key={step.id}
              className={`flex items-start gap-3.5 rounded-xl border p-4 transition-all ${
                state === "in_progress"
                  ? "border-indigo-200 bg-indigo-50/50 shadow-sm"
                  : state === "complete"
                  ? "border-emerald-200 bg-emerald-50/40"
                  : state === "failed"
                  ? "border-red-200 bg-red-50/50"
                  : "border-[#E2E8F0] bg-white"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {state === "complete" ? (
                  <CheckCircle2 className="size-5 text-emerald-500" />
                ) : state === "in_progress" ? (
                  isTriggering ? (
                    <Loader2 className="size-5 text-indigo-500 animate-spin" />
                  ) : (
                    <Loader2 className="size-5 text-indigo-500 animate-spin" />
                  )
                ) : state === "failed" ? (
                  <AlertCircle className="size-5 text-red-500" />
                ) : (
                  <Circle className="size-5 text-[#CBD5E1]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold leading-snug ${
                    state === "pending"
                      ? "text-[#94A3B8]"
                      : state === "failed"
                      ? "text-red-700"
                      : "text-[#0F172A]"
                  }`}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p
                    className={`text-xs mt-0.5 ${
                      state === "pending" ? "text-[#CBD5E1]" : "text-[#64748B]"
                    }`}
                  >
                    {step.description}
                  </p>
                )}
                {state === "in_progress" && (
                  <p className="text-xs mt-1 text-indigo-500">
                    {isTriggering ? "Starting…" : "Working on it…"}
                  </p>
                )}
                {state === "failed" && (
                  <div className="mt-2 flex flex-col gap-2">
                    <p className="text-xs text-red-600">
                      Something went wrong. You can retry this step.
                    </p>
                    <button
                      type="button"
                      onClick={retry}
                      className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <RotateCw className="size-3.5" />
                      Retry
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {isComplete && (
        <p className="text-center text-sm font-medium text-emerald-600">
          All done — taking you to your results…
        </p>
      )}
    </div>
  );
}
