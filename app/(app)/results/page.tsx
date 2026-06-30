import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/session";
import { getSignedImageUrl } from "@/lib/storage";
import { CreativeCard } from "@/components/creative-card";
import { CreativeRankingTable } from "@/components/creative-ranking-table";
import { DownloadCampaignButton } from "@/components/download-campaign-button";
import { RefreshWhileGenerating } from "@/components/refresh-while-generating";
import { TestingPlanView } from "@/components/testing-plan-view";
import { StepsIndicator, type Step } from "@/components/steps-indicator";
import type {
  AngleLabel,
  ImageStatus,
  TestingPlan,
  TestingPlanContent,
  AspectRatio,
} from "@/lib/types";
import { ArrowLeft, Trophy, Target, CheckCircle2, TrendingUp } from "lucide-react";

interface CreativeData {
  id: string;
  creativeIndex: number;
  angleLabel: AngleLabel;
  headline: string;
  primaryText: string;
  cta: string;
  score: number;
  rationale: string;
  imageStatus: ImageStatus;
  imageUrl: string | null;
  placement: string | null;
  aspectRatio: AspectRatio | null;
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

  // Fetch creatives with joined angle labels, scores, and rationales.
  const { data: creativesRows } = await supabase
    .from("ad_creatives")
    .select("id, angle_id, creative_index, concept, placement, aspect_ratio, headline, primary_text, cta, image_status, image_storage_path, ad_angles(angle_label, score, rationale)")
    .eq("session_id", session.id)
    .order("creative_index", { ascending: true });

  if (!creativesRows || creativesRows.length === 0) {
    redirect("/checkout");
  }

  const rawCreatives = creativesRows as unknown as {
    id: string;
    angle_id: string;
    creative_index: number;
    concept: string;
    placement: string | null;
    aspect_ratio: AspectRatio | null;
    headline: string | null;
    primary_text: string | null;
    cta: string | null;
    image_status: ImageStatus;
    image_storage_path: string | null;
    ad_angles: { angle_label: AngleLabel; score: number | null; rationale: string | null } | null;
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
        creativeIndex: c.creative_index,
        angleLabel: c.ad_angles?.angle_label ?? ("" as AngleLabel),
        headline: c.headline ?? "",
        primaryText: c.primary_text ?? "",
        cta: c.cta ?? "",
        score: c.ad_angles?.score ?? 0,
        rationale: c.ad_angles?.rationale ?? "",
        imageStatus: c.image_status,
        imageUrl,
        placement: c.placement,
        aspectRatio: c.aspect_ratio,
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

  const strategy = testingPlan ?? undefined;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fafafe] via-[#f5f3ff] to-[#eef2ff]">
      <RefreshWhileGenerating hasPendingImages={!allImagesReady} />
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
              AI Creative Strategist Campaign Launch Plan
            </h1>
            <p className="text-sm text-[#64748B]">
              Your first Meta Ads testing sprint — download the full package with the
              PDF report and all three ready-to-upload creative images.
            </p>
          </div>
          <DownloadCampaignButton disabled={!allImagesReady} />
        </div>

        {/* Image generation status */}
        {!allImagesReady && (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <div className="size-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800">
                Creative images are still being generated
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Your strategy, copy, and testing plan are ready. The ad images are
                being generated in the background and will appear here as they become
                available.
              </p>
            </div>
          </div>
        )}

        {/* 1. Recommended First Test */}
        {strategy?.recommendedFirstTest && strategy?.campaignStrategy && (
          <section className="mb-8">
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="size-6 text-amber-600" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-amber-800">
                  Recommended First Test
                </h2>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-[#0F172A] mb-4">
                Creative #{strategy.campaignStrategy.recommendedWinner} — {strategy.recommendedFirstTest.creativeName}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
                    Why this should be tested first
                  </p>
                  <p className="text-sm text-[#0F172A]">{strategy.recommendedFirstTest.why}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
                    Expected outcome
                  </p>
                  <p className="text-sm text-[#0F172A]">{strategy.recommendedFirstTest.expectedOutcome}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
                    Run on
                  </p>
                  <p className="text-sm text-[#0F172A]">{strategy.recommendedFirstTest.runOn}</p>
                </div>
              </div>

              {/* KPIs */}
              <div className="mt-5 rounded-xl border border-amber-200 bg-white/60 p-4">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-3">
                  Success signals
                </p>
                {strategy.successCriteria ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B] mb-0.5">Purchases</p>
                      <p className="text-sm font-bold text-[#0F172A]">At least 1 purchase</p>
                      <p className="text-[11px] text-[#64748B] mt-0.5">{strategy.successCriteria.purchases.goal}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B] mb-0.5">Target CPA</p>
                      <p className="text-sm font-bold text-[#0F172A]">
                        {strategy.targetCpa ? strategy.targetCpa.formatted : "Below target CPA"}
                      </p>
                      <p className="text-[11px] text-[#64748B] mt-0.5">
                        {strategy.targetCpa
                          ? `Recommended maximum cost per purchase for a $${strategy.targetCpa.sellingPrice} product.`
                          : "Cost per purchase should stay below the target CPA."}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B] mb-0.5">CTR</p>
                      <p className="text-sm font-bold text-emerald-700">Good: {strategy.successCriteria.ctr.good}</p>
                      <p className="text-[11px] text-[#64748B] mt-0.5">Average: {strategy.successCriteria.ctr.average} · Poor: {strategy.successCriteria.ctr.poor}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B] mb-0.5">CPC</p>
                      <p className="text-sm font-bold text-emerald-700">Good: {strategy.successCriteria.cpc.good}</p>
                      <p className="text-[11px] text-[#64748B] mt-0.5">Average: {strategy.successCriteria.cpc.average} · Poor: {strategy.successCriteria.cpc.poor}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B] mb-0.5">Primary KPI</p>
                      <p className="text-sm font-bold text-[#0F172A]">Purchases</p>
                      <p className="text-[11px] text-[#64748B] mt-0.5">The ultimate goal is identifying which creative drives purchase intent.</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B] mb-0.5">Secondary KPI</p>
                      <p className="text-sm font-bold text-[#0F172A]">Cost Per Purchase</p>
                      <p className="text-[11px] text-[#64748B] mt-0.5">Lower cost per purchase indicates stronger market resonance.</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B] mb-0.5">Supporting KPI</p>
                      <p className="text-sm font-bold text-[#0F172A]">CTR</p>
                      <p className="text-[11px] text-[#64748B] mt-0.5">Higher CTR indicates stronger creative engagement.</p>
                    </div>
                  </div>
                )}
              </div>

              {strategy.recommendedFirstTest.selectionRationale && strategy.recommendedFirstTest.selectionRationale.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">
                    Why this was selected
                  </p>
                  <ul className="space-y-2">
                    {strategy.recommendedFirstTest.selectionRationale.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-[#0F172A]">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* What to do next */}
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-3">
                  What to do next
                </p>
                <ol className="space-y-1.5">
                  {[
                    "Open Meta Ads Manager.",
                    "Create one Sales campaign.",
                    "Create one broad ad set.",
                    `Upload Creative #${strategy.campaignStrategy.recommendedWinner} (the recommended creative above).`,
                    "Set your daily budget and run for 3 days.",
                    "Return to this report and compare results.",
                  ].map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-[#0F172A]">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>
        )}

        {/* 2. Customer Insights */}
        {strategy?.customerInsights && (
          <section className="mb-12">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xl p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-5">
                <Target className="size-5 text-indigo-500" />
                <h2
                  className="text-lg sm:text-xl font-bold text-[#0F172A]"
                  style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
                >
                  Customer Insights
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <p className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                    Target buyer
                  </p>
                  <p className="text-sm text-[#0F172A]">{strategy.customerInsights.targetBuyer}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                    Main pain
                  </p>
                  <p className="text-sm text-[#0F172A]">{strategy.customerInsights.mainPain}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                    Main desire
                  </p>
                  <p className="text-sm text-[#0F172A]">{strategy.customerInsights.mainDesire}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                    Main buying trigger
                  </p>
                  <p className="text-sm text-[#0F172A]">{strategy.customerInsights.mainBuyingTrigger}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                    Main objection
                  </p>
                  <p className="text-sm text-[#0F172A]">{strategy.customerInsights.mainObjection}</p>
                </div>
                {strategy.customerInsights.mostImportantBuyerEmotion && (
                  <div className="sm:col-span-2 rounded-xl bg-indigo-50 border border-indigo-100 p-4">
                    <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-1">
                      Most important buyer emotion
                    </p>
                    <p className="text-sm text-[#0F172A] italic">{strategy.customerInsights.mostImportantBuyerEmotion}</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 3. Ready To Test Creatives */}
        <section className="mb-12">
          <div className="mb-5">
            <h2
              className="text-lg sm:text-xl font-bold text-[#0F172A]"
              style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
            >
              Your First Testing Sprint
            </h2>
            <p className="text-sm text-[#64748B]">
              Three creative angles ranked by testing priority.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {creatives.map((creative) => (
              <CreativeCard
                key={creative.id}
                creative={creative}
                strategy={strategy?.creativeStrategies.find((s) => s.creativeIndex === creative.creativeIndex)}
                index={creative.creativeIndex - 1}
              />
            ))}
          </div>
        </section>

        {/* 4. Why This Creative Won */}
        {strategy?.whyWinner && strategy.whyWinner.length > 0 && (
          <section className="mb-8">
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="size-6 text-emerald-600" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-800">
                  Why This Creative Won
                </h2>
              </div>
              <p className="text-sm text-emerald-800 mb-4">
                The winner was selected systematically from a fixed scoring framework — not by AI judgment.
              </p>
              <ul className="space-y-2">
                {strategy.whyWinner.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-[#0F172A]">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* 5. Campaign Launch Plan */}
        {testingPlan && (
          <section className="mb-12">
            <TestingPlanView plan={testingPlan} />
          </section>
        )}

        {/* 6. Creative Ranking Summary */}
        {strategy?.creativeStrategies && strategy.creativeStrategies.length > 0 && (
          <section className="mb-12">
            <div className="mb-5">
              <h2
                className="text-lg sm:text-xl font-bold text-[#0F172A]"
                style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
              >
                Creative Ranking Summary
              </h2>
              <p className="text-sm text-[#64748B]">
                A compact view of each angle, psychology, and testing priority.
              </p>
            </div>
            <CreativeRankingTable strategies={strategy.creativeStrategies} />
          </section>
        )}

        {/* 7. Why This Was Not Chosen First */}
        {strategy?.whyNotOthers && strategy.whyNotOthers.length > 0 && (
          <section className="mb-12">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xl p-6 sm:p-8">
              <h2
                className="text-lg sm:text-xl font-bold text-[#0F172A] mb-1"
                style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
              >
                Why This Was Not Chosen First
              </h2>
              <p className="text-sm text-[#64748B] mb-5">
                These creatives still belong in your testing sprint, but are recommended later.
              </p>
              <div className="space-y-3">
                {strategy.whyNotOthers.map((item) => (
                  <div key={item.creativeIndex} className="rounded-xl border border-[#E2E8F0] p-4">
                    <p className="text-sm font-bold text-[#0F172A]">
                      Creative #{item.creativeIndex}
                    </p>
                    <p className="text-sm text-[#64748B] mt-1">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 8. How to Use This Campaign Launch Plan */}
        {strategy?.workflow && strategy?.campaignStrategy && (
          <section className="mb-12">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xl p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="size-5 text-indigo-500" />
                <h2
                  className="text-lg sm:text-xl font-bold text-[#0F172A]"
                  style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
                >
                  How to Use This Campaign Launch Plan
                </h2>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 flex items-start gap-3">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white mt-0.5">1</span>
                  <div>
                    <p className="text-sm font-bold text-[#0F172A]">Day 1</p>
                    <p className="text-sm text-[#64748B] mt-0.5">{strategy.workflow.day1}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 flex items-start gap-3">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-500 text-[10px] font-bold text-white mt-0.5">4</span>
                  <div>
                    <p className="text-sm font-bold text-[#0F172A]">Day 4</p>
                    <p className="text-sm text-[#64748B] mt-0.5">{strategy.workflow.day4}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-emerald-800">If Creative #{strategy.campaignStrategy.recommendedWinner} wins</p>
                    <p className="text-sm text-emerald-700 mt-0.5">{strategy.workflow.ifWinner}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                  <span className="text-lg shrink-0 mt-0.5">→</span>
                  <div>
                    <p className="text-sm font-bold text-amber-800">If Creative #{strategy.campaignStrategy.recommendedWinner} loses</p>
                    <p className="text-sm text-amber-700 mt-0.5">{strategy.workflow.ifLoser}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 flex items-start gap-3">
                  <span className="text-lg shrink-0 mt-0.5">↻</span>
                  <div>
                    <p className="text-sm font-bold text-[#0F172A]">If no creatives perform</p>
                    <p className="text-sm text-[#64748B] mt-0.5">{strategy.workflow.ifNone}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 9. Disclaimer */}
        {strategy?.disclaimer && (
          <section className="mb-12">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-8">
              <p className="text-sm text-[#64748B] leading-relaxed">
                {strategy.disclaimer}
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
