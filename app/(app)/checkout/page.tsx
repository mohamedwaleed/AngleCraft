import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  getSessionByToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/session";
import { PostPaymentPipeline } from "@/components/post-payment-pipeline";
import { PaymentPendingPoller } from "@/components/payment-pending-poller";
import { StepsIndicator, type Step } from "@/components/steps-indicator";
import { ArrowLeft } from "lucide-react";

const STEPS: Step[] = [
  { id: "submit", number: 1, label: "Submit Product", description: "Enter your product URL" },
  { id: "angles", number: 2, label: "Get Ad Angles", description: "AI finds winning angles" },
  { id: "ads", number: 3, label: "Get Your Ads", description: "Download your ad package" },
];

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    success?: string;
    canceled?: string;
    session_token?: string;
  }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const sessionToken = cookieToken ?? params.session_token;

  if (!sessionToken) {
    redirect("/");
  }

  const session = await getSessionByToken(sessionToken);
  if (!session) {
    redirect("/");
  }

  // Restore the anonymous session cookie when returning from Stripe so that
  // client-side polls and subsequent route handlers can identify the session.
  if (params.session_token && params.session_token !== cookieToken) {
    cookieStore.set(SESSION_COOKIE_NAME, params.session_token, sessionCookieOptions());
  }

  if (session.status === "complete") {
    redirect("/results");
  }

  const supabase = await createClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("status")
    .eq("session_id", session.id)
    .maybeSingle();

  const isPaid =
    session.status === "paid" ||
    session.status === "generating" ||
    payment?.status === "succeeded";

  // Reconcile: if payment succeeded but session status hasn't been updated
  // yet (webhook race), treat the session as paid for the pipeline.
  const pipelineStatus =
    session.status === "paid" || session.status === "generating"
      ? session.status
      : payment?.status === "succeeded"
        ? "paid"
        : session.status;

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
        <div className="mb-10 sm:mb-12">
          <StepsIndicator steps={STEPS} currentStepId="ads" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <h1
              className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-3"
              style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
            >
              Building your campaign
            </h1>
            <p className="text-sm text-[#64748B] mb-6">
              Payment confirmed. We&apos;re now generating your full ad campaign
              — three ready-to-run creatives plus a Meta/TikTok testing plan.
            </p>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8] mb-2">
                What you get
              </p>
              <ul className="text-sm text-[#64748B] space-y-2">
                <li className="flex items-start gap-2">
                  <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
                    1
                  </span>
                  3 AI-generated ad concepts.
                </li>
                <li className="flex items-start gap-2">
                  <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
                    2
                  </span>
                  Headlines, body copy, CTAs, and images.
                </li>
                <li className="flex items-start gap-2">
                  <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
                    3
                  </span>
                  A complete testing plan for Meta + TikTok.
                </li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xl p-6 sm:p-8">
              {params.canceled === "true" ? (
                <div className="text-center">
                  <h2
                    className="text-lg font-bold text-[#0F172A] mb-2"
                    style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
                  >
                    Payment canceled
                  </h2>
                  <p className="text-sm text-[#64748B] mb-4">
                    You can return to your preview and try again whenever you&apos;re ready.
                  </p>
                  <Link
                    href="/preview"
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                  >
                    Back to preview
                  </Link>
                </div>
              ) : isPaid ? (
                <PostPaymentPipeline initialStatus={pipelineStatus} />
              ) : (
                <div className="text-center">
                  <PaymentPendingPoller />
                  <h2
                    className="text-lg font-bold text-[#0F172A] mb-2"
                    style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
                  >
                    Confirming payment
                  </h2>
                  <p className="text-sm text-[#64748B]">
                    Waiting for Stripe to confirm your payment. This usually takes
                    a few seconds.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
