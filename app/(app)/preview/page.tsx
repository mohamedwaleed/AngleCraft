import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/session";
import { BuyerInsights } from "@/components/buyer-insights";
import { ArrowLeft, Sparkles, Lock } from "lucide-react";

interface BuyerInsightsData {
  buyerProfile: string;
  mainDesire: string;
  painPoints: string[];
  buyingTriggers: string[];
  objections: string[];
}

export default async function PreviewPage() {
  const session = await getSessionFromCookie();

  if (!session) {
    redirect("/");
  }

  // Resume logic: route the user to the right stage based on session status.
  if (session.status === "input" || session.status === "extracting" || session.status === "analyzing") {
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
    // Insights not ready yet — go back to the pipeline.
    redirect("/status");
  }

  const buyerInsights: BuyerInsightsData = {
    buyerProfile: buyerInsightsRow.buyer_profile,
    mainDesire: buyerInsightsRow.main_desire,
    painPoints: buyerInsightsRow.pain_points,
    buyingTriggers: buyerInsightsRow.buying_triggers,
    objections: buyerInsightsRow.objections,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fafafe] via-[#f5f3ff] to-[#eef2ff]">
      <header className="border-b border-[#E2E8F0] bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 flex h-16 items-center justify-between">
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

      <main className="mx-auto max-w-3xl px-5 sm:px-6 py-10 sm:py-16">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 mb-4">
            <Sparkles className="size-3.5" />
            Free Preview Ready
          </div>
          <h1
            className="text-2xl sm:text-4xl font-bold text-[#0F172A] mb-3"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
          >
            Your Buyer Insights
          </h1>
          <p className="text-sm sm:text-base text-[#64748B] max-w-xl mx-auto">
            Here&apos;s what we learned about who buys your product and why.
            Your five ad angles are next.
          </p>
        </div>

        {/* Buyer Insights */}
        <section className="mb-10">
          <BuyerInsights data={buyerInsights} />
        </section>

        {/* Angles placeholder — filled in by User Story 2 (T029/T030) */}
        <section className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white/60 p-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-600 mb-3">
            <Lock className="size-2.5" />
            Coming next
          </div>
          <h2
            className="text-lg font-bold text-[#0F172A] mb-1"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
          >
            Five ad angles with hooks
          </h2>
          <p className="text-sm text-[#64748B]">
            Your five labeled ad angles — each with a strong hook — will appear
            here once generation finishes.
          </p>
        </section>
      </main>
    </div>
  );
}
