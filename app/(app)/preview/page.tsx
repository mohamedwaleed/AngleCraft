import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/session";
import { BuyerInsights } from "@/components/buyer-insights";
import { AnglePreview } from "@/components/angle-preview";
import { PaywallCard } from "@/components/paywall-card";
import { StepsIndicator, type Step } from "@/components/steps-indicator";
import type { AngleLabel } from "@/lib/types";
import { ArrowLeft } from "lucide-react";

interface BuyerInsightsData {
  buyerProfile: string;
  mainDesire: string;
  painPoints: string[];
  buyingTriggers: string[];
  objections: string[];
}

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

const STEPS: Step[] = [
  { id: "submit", number: 1, label: "Submit Product", description: "Enter your product URL" },
  { id: "angles", number: 2, label: "Get Ad Angles", description: "AI finds high-priority angles" },
  { id: "ads", number: 3, label: "Get Your Ads", description: "Download your ad package" },
];

export default async function PreviewPage() {
  const session = await getSessionFromCookie();

  if (!session) {
    redirect("/");
  }

  // Resume logic: route the user to the right stage based on session status.
  if (session.status === "input" || session.status === "extracting" || session.status === "analyzing" || session.status === "generating_angles") {
    redirect("/status");
  }
  if (session.status === "paid" || session.status === "generating") {
    redirect("/checkout");
  }
  if (session.status === "complete") {
    redirect("/results");
  }

  const supabase = await createClient();

  const { data: buyerInsightsRow } = await supabase
    .from("buyer_insights")
    .select()
    .eq("session_id", session.id)
    .maybeSingle();

  if (!buyerInsightsRow) {
    redirect("/status");
  }

  const buyerInsights: BuyerInsightsData = {
    buyerProfile: buyerInsightsRow.buyer_profile,
    mainDesire: buyerInsightsRow.main_desire,
    painPoints: buyerInsightsRow.pain_points,
    buyingTriggers: buyerInsightsRow.buying_triggers,
    objections: buyerInsightsRow.objections,
  };

  const { data: anglesRows } = await supabase
    .from("ad_angles")
    .select()
    .eq("session_id", session.id);

  const angles: AngleItem[] = (anglesRows ?? []).map((a) => ({
    id: (a as { id: string }).id,
    angleLabel: (a as { angle_label: AngleLabel }).angle_label,
    angleName: (a as { angle_name: string }).angle_name,
    buyerEmotion: (a as { buyer_emotion: string }).buyer_emotion,
    purchaseMotivation: (a as { purchase_motivation: string }).purchase_motivation,
    psychologicalTrigger: (a as { psychological_trigger: string }).psychological_trigger,
    problemSolved: (a as { problem_solved: string }).problem_solved,
    idealAudience: (a as { ideal_audience: string }).ideal_audience,
    useCase: (a as { use_case: string }).use_case,
    exampleHook: (a as { hook: string }).hook,
    rationale: (a as { rationale: string | null }).rationale ?? "",
    score: (a as { score: number | null }).score ?? 0,
    isSelected: (a as { is_selected: boolean }).is_selected,
  }));

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
          <StepsIndicator steps={STEPS} currentStepId="angles" />
        </div>

        {/* Angles section */}
        <section className="mb-10 sm:mb-12">
          {angles.length > 0 ? (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xl p-6 sm:p-8">
              <AnglePreview angles={angles} />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white/60 p-8 text-center">
              <h2
                className="text-lg font-bold text-[#0F172A] mb-1"
                style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
              >
                Five ad angles with buyer psychology
              </h2>
              <p className="text-sm text-[#64748B]">
                Your five highest-priority ad angles — each with a buyer-psychology
                framework — will appear here once generation finishes.
              </p>
            </div>
          )}
        </section>

        {/* Paywall CTA */}
        {session.status === "angles_generated" && (
          <section className="mb-10 sm:mb-12">
            <PaywallCard />
          </section>
        )}

        {/* Buyer Insights */}
        <section>
          <BuyerInsights data={buyerInsights} />
        </section>
      </main>
    </div>
  );
}
