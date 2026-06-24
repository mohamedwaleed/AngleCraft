import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/session";
import { StatusPipeline, type PipelineStep } from "@/components/status-pipeline";
import type { SessionStatus } from "@/lib/types";
import { ArrowLeft, Sparkles } from "lucide-react";

const PRE_PAYMENT_STEPS: PipelineStep[] = [
  {
    id: "extract",
    label: "Extracting product information",
    description: "Reading your product page and pulling the key details.",
    activeStatuses: ["extracting"],
    completeStatuses: ["analyzing", "angles_generated", "paid", "generating", "complete"],
  },
  {
    id: "analyze",
    label: "Analyzing product",
    description: "Building a buyer psychology profile for your product.",
    activeStatuses: ["analyzing"],
    completeStatuses: ["angles_generated", "paid", "generating", "complete"],
    triggerEndpoint: "/api/analyze",
  },
  {
    id: "angles",
    label: "Generating ad angles",
    description: "Writing five ad angles with hooks and scoring them.",
    // In Phase 3, the analyze route sets status to `angles_generated` which
    // completes the pipeline and navigates to /preview. The /api/angles
    // endpoint is wired in Phase 4 (T031) — until then this step is a visual
    // placeholder that completes together with the analyze step.
    activeStatuses: [],
    completeStatuses: ["angles_generated", "paid", "generating", "complete"],
  },
];

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fafafe] via-[#f5f3ff] to-[#eef2ff]">
      <header className="border-b border-[#E2E8F0] bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-[17px] font-bold tracking-tight"
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

      <main className="mx-auto max-w-xl px-5 sm:px-6 py-12 sm:py-20">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm mb-4">
            <Sparkles className="size-3.5" />
            Building your free strategy
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-2"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
          >
            Crafting your ad angles
          </h1>
          <p className="text-sm text-[#64748B] max-w-sm mx-auto">
            Hang tight — this usually takes under two minutes. You can leave this
            page open while we work.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xl p-6 sm:p-8">
          <StatusPipeline
            steps={PRE_PAYMENT_STEPS}
            initialStatus={currentStatus}
            onCompleteHref="/preview"
          />
        </div>
      </main>
    </div>
  );
}
