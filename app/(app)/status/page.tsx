import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/session";
import { StatusPipeline, type PipelineStep } from "@/components/status-pipeline";
import { StepsIndicator, type Step } from "@/components/steps-indicator";
import type { SessionStatus } from "@/lib/types";
import { ArrowLeft } from "lucide-react";

const PRE_PAYMENT_STEPS: PipelineStep[] = [
  {
    id: "extract",
    label: "Extracting product information",
    description: "Reading your product page and pulling the key details.",
    activeStatuses: ["extracting"],
    completeStatuses: ["analyzing", "generating_angles", "angles_generated", "paid", "generating", "complete"],
  },
  {
    id: "analyze",
    label: "Analyzing product",
    description: "Building a buyer psychology profile for your product.",
    activeStatuses: ["analyzing"],
    completeStatuses: ["generating_angles", "angles_generated", "paid", "generating", "complete"],
    triggerEndpoint: "/api/analyze",
  },
  {
    id: "angles",
    label: "Generating ad angles",
    description: "Writing five ad angles with hooks and scoring them.",
    activeStatuses: ["generating_angles"],
    completeStatuses: ["angles_generated", "paid", "generating", "complete"],
    triggerEndpoint: "/api/angles",
  },
];

const STEPS: Step[] = [
  { id: "submit", number: 1, label: "Submit Product", description: "Enter your product URL" },
  { id: "angles", number: 2, label: "Get Ad Angles", description: "AI finds winning angles" },
  { id: "ads", number: 3, label: "Get Your Ads", description: "Download your ad package" },
];

function getCurrentStepId(status: SessionStatus): string {
  if (status === "input" || status === "extracting" || status === "analyzing") return "submit";
  if (status === "generating_angles" || status === "angles_generated") return "angles";
  if (status === "paid" || status === "generating" || status === "complete") return "ads";
  return "submit";
}

export default async function StatusPage() {
  const session = await getSessionFromCookie();

  if (!session) {
    redirect("/");
  }

  // Resume logic: if the session is already past the free preview, send the
  // user to the right place instead of re-running the pipeline.
  if (session.status === "paid" || session.status === "generating") {
    redirect("/checkout");
  }
  if (session.status === "complete") {
    redirect("/results");
  }

  // If angles are already generated, the preview page is the right destination.
  if (session.status === "angles_generated") {
    redirect("/preview");
  }

  // If the session is brand new (no extraction yet), send back to landing.
  if (session.status === "input") {
    redirect("/");
  }

  const supabase = await createClient();

  // Confirm a product_inputs row exists. If not, the user landed here without
  // submitting — send them back to the landing page.
  const { data: productInput } = await supabase
    .from("product_inputs")
    .select("id")
    .eq("session_id", session.id)
    .maybeSingle();

  if (!productInput) {
    redirect("/");
  }

  const currentStatus = session.status as SessionStatus;
  const currentStepId = getCurrentStepId(currentStatus);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fafafe] via-[#f5f3ff] to-[#eef2ff]">
      <header className="border-b border-[#E2E8F0] bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <Link
            href="/"
            className="text-[17px] font-bold tracking-tight"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
          >
            Angle<span className="text-indigo-500">Craft</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#0F172A] transition-colors"
          >
            <ArrowLeft className="size-4" />
            Start over
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Step indicator */}
        <div className="mb-10 sm:mb-12">
          <StepsIndicator steps={STEPS} currentStepId={currentStepId} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: headline + reassurance */}
          <div className="lg:col-span-1">
            <h1
              className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-3"
              style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
            >
              Crafting your ad angles
            </h1>
            <p className="text-sm text-[#64748B] mb-6">
              We&apos;re reading your product page, analyzing the buyer psychology,
              and writing five winning ad angles. This usually takes under two
              minutes.
            </p>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8] mb-2">
                What happens next
              </p>
              <ul className="text-sm text-[#64748B] space-y-2">
                <li className="flex items-start gap-2">
                  <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
                    1
                  </span>
                  You review the free preview.
                </li>
                <li className="flex items-start gap-2">
                  <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
                    2
                  </span>
                  Pay $9 to unlock the full campaign.
                </li>
                <li className="flex items-start gap-2">
                  <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
                    3
                  </span>
                  Download 3 ad creatives + testing plan.
                </li>
              </ul>
            </div>
          </div>

          {/* Right column: pipeline */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xl p-6 sm:p-8">
              <StatusPipeline
                steps={PRE_PAYMENT_STEPS}
                initialStatus={currentStatus}
                onCompleteHref="/preview"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
