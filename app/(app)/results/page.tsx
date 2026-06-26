import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/session";
import { getSignedImageUrl } from "@/lib/storage";
import { CreativeCard } from "@/components/creative-card";
import { DownloadPdfButton } from "@/components/download-pdf-button";
import { StepsIndicator, type Step } from "@/components/steps-indicator";
import type {
  AngleLabel,
  ImageStatus,
  TestingPlan,
  TestingPlanContent,
} from "@/lib/types";
import { ArrowLeft } from "lucide-react";

interface CreativeData {
  id: string;
  angleLabel: AngleLabel;
  headline: string;
  primaryText: string;
  cta: string;
  imageStatus: ImageStatus;
  imageUrl: string | null;
}

const STEPS: Step[] = [
  { id: "submit", number: 1, label: "Submit Product", description: "Enter your product URL" },
  { id: "angles", number: 2, label: "Get Ad Angles", description: "AI finds winning angles" },
  { id: "ads", number: 3, label: "Get Your Ads", description: "Download your ad package" },
];

export default async function ResultsPage() {
  const session = await getSessionFromCookie();

  if (!session) {
    redirect("/");
  }

  // Redirect to appropriate stage based on session status.
  if (
    session.status === "input" ||
    session.status === "extracting" ||
    session.status === "analyzing" ||
    session.status === "generating_angles" ||
    session.status === "angles_generated"
  ) {
    redirect("/preview");
  }
  if (session.status === "paid" || session.status === "generating") {
    redirect("/checkout");
  }

  const supabase = await createClient();

  // Fetch creatives with joined angle labels.
  const { data: creativesRows } = await supabase
    .from("ad_creatives")
    .select("id, angle_id, concept, headline, primary_text, cta, image_status, image_storage_path, ad_angles(angle_label)")
    .eq("session_id", session.id);

  if (!creativesRows || creativesRows.length === 0) {
    redirect("/checkout");
  }

  const rawCreatives = creativesRows as unknown as {
    id: string;
    angle_id: string;
    concept: string;
    headline: string | null;
    primary_text: string | null;
    cta: string | null;
    image_status: ImageStatus;
    image_storage_path: string | null;
    ad_angles: { angle_label: AngleLabel } | null;
  }[];

  // Generate signed URLs for completed images.
  const creatives: CreativeData[] = await Promise.all(
    rawCreatives.map(async (c) => {
      let imageUrl: string | null = null;
      if (c.image_storage_path && c.image_status === "complete") {
        try {
          imageUrl = await getSignedImageUrl("ad-creatives", c.image_storage_path);
        } catch (err) {
          console.error("results: signed URL failed:", err);
        }
      }
      return {
        id: c.id,
        angleLabel: c.ad_angles?.angle_label ?? ("" as AngleLabel),
        headline: c.headline ?? "",
        primaryText: c.primary_text ?? "",
        cta: c.cta ?? "",
        imageStatus: c.image_status,
        imageUrl,
      };
    })
  );

  // Fetch testing plan.
  const { data: testingPlanRow } = await supabase
    .from("testing_plans")
    .select()
    .eq("session_id", session.id)
    .maybeSingle();

  const testingPlan: TestingPlanContent | null = testingPlanRow
    ? (testingPlanRow as TestingPlan).plan_content
    : null;

  const allImagesReady = creatives.every((c) => c.imageStatus === "complete");

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
          <StepsIndicator steps={STEPS} currentStepId="ads" />
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-1"
              style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
            >
              Your Ad Campaign
            </h1>
            <p className="text-sm text-[#64748B]">
              Three ready-to-run ad creatives for Meta and TikTok.
            </p>
          </div>
          <DownloadPdfButton />
        </div>

        {/* Image generation status */}
        {!allImagesReady && (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <div className="size-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800">
                Images are still generating
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Your ad images are being generated in the background. The page will
                update automatically as they become available.
              </p>
            </div>
          </div>
        )}

        {/* Creatives grid */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {creatives.map((creative, i) => (
              <CreativeCard
                key={creative.id}
                creative={creative}
                index={i}
              />
            ))}
          </div>
        </section>

        {/* Testing Plan */}
        {testingPlan && (
          <section className="mb-12">
            <h2
              className="text-xl sm:text-2xl font-bold text-[#0F172A] mb-6"
              style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
            >
              Testing Plan
            </h2>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xl p-6 sm:p-8 space-y-6">
              {/* Platforms */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[#94A3B8] mb-2">
                  Platforms
                </h3>
                <div className="flex gap-2">
                  {testingPlan.platforms.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 capitalize"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[#94A3B8] mb-3">
                  Budget Allocation
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-[#E2E8F0] p-4">
                    <p className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                      Meta
                    </p>
                    <p className="text-sm text-[#0F172A]">
                      <strong>Total:</strong> {testingPlan.budgetAllocation.meta.totalBudget}
                    </p>
                    <p className="text-sm text-[#0F172A]">
                      <strong>Per Angle:</strong> {testingPlan.budgetAllocation.meta.perAngleBudget}
                    </p>
                    <p className="text-sm text-[#0F172A]">
                      <strong>Duration:</strong> {testingPlan.budgetAllocation.meta.duration}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#E2E8F0] p-4">
                    <p className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                      TikTok
                    </p>
                    <p className="text-sm text-[#0F172A]">
                      <strong>Total:</strong> {testingPlan.budgetAllocation.tiktok.totalBudget}
                    </p>
                    <p className="text-sm text-[#0F172A]">
                      <strong>Per Angle:</strong> {testingPlan.budgetAllocation.tiktok.perAngleBudget}
                    </p>
                    <p className="text-sm text-[#0F172A]">
                      <strong>Duration:</strong> {testingPlan.budgetAllocation.tiktok.duration}
                    </p>
                  </div>
                </div>
              </div>

              {/* Audience */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[#94A3B8] mb-2">
                  Audience Guidance
                </h3>
                <div className="space-y-2">
                  <p className="text-sm text-[#0F172A]">
                    <strong>Meta:</strong> {testingPlan.audienceGuidance.meta}
                  </p>
                  <p className="text-sm text-[#0F172A]">
                    <strong>TikTok:</strong> {testingPlan.audienceGuidance.tiktok}
                  </p>
                </div>
              </div>

              {/* Duration */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[#94A3B8] mb-2">
                  Testing Duration
                </h3>
                <p className="text-sm font-bold text-[#0F172A]">
                  {testingPlan.testingDuration.recommendedDays} days
                </p>
                <p className="text-sm text-[#64748B] mt-1">
                  {testingPlan.testingDuration.reasoning}
                </p>
              </div>

              {/* Key Metrics */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[#94A3B8] mb-3">
                  Key Metrics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {testingPlan.keyMetrics.map((m, i) => (
                    <div key={i} className="rounded-xl border border-[#E2E8F0] p-4">
                      <p className="text-sm font-bold text-[#0F172A]">{m.metric}</p>
                      <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                        Target: {m.target}
                      </p>
                      <p className="text-xs text-[#64748B] mt-1">{m.why}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Per-Angle Guidance */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[#94A3B8] mb-3">
                  Per-Angle Guidance
                </h3>
                <div className="space-y-3">
                  {testingPlan.perAngleGuidance.map((g, i) => (
                    <div key={i} className="rounded-xl border border-[#E2E8F0] p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-[#0F172A]">
                          {g.angleLabel}
                        </span>
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600">
                          {g.priority}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] mb-1">
                        <strong>Hypothesis:</strong> {g.hypothesis}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        <strong>Recommendation:</strong> {g.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Bottom download CTA */}
        <section className="text-center pb-12">
          <h2
            className="text-xl font-bold text-[#0F172A] mb-2"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
          >
            Ready to launch?
          </h2>
          <p className="text-sm text-[#64748B] mb-6">
            Download the full campaign report with all creatives, angles, and your testing plan.
          </p>
          <DownloadPdfButton />
        </section>
      </main>
    </div>
  );
}
