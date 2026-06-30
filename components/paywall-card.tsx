"use client";

import { CheckoutButton } from "@/components/checkout-button";
import { Check, ImageIcon, FileText, BarChart3, Shield } from "lucide-react";

export function PaywallCard() {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 shadow-xl p-6 sm:p-8">
      <div className="text-center mb-6">
        <span className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white mb-4">
          First 100 users only
        </span>
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-lg text-[#94A3B8] line-through">$8.99</span>
          <span className="text-3xl sm:text-4xl font-bold text-[#0F172A]">$4.99</span>
        </div>
        <h2
          className="text-xl sm:text-2xl font-bold text-[#0F172A] mb-3"
          style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
        >
          Turn your top angle into 3 ready-to-test ads
        </h2>
        <p className="text-sm text-[#64748B] max-w-xl mx-auto">
          Upgrade to get 3 fully-built ad creatives — image, headline, copy,
          and CTA — plus a Meta Ads testing plan, so you can launch today
          instead of guessing.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 md:items-start mb-6">
        {/* Free vs paid comparison */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
          <h3
            className="text-sm font-semibold text-[#0F172A] mb-4"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
          >
            What you get
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 text-sm">
              <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check className="size-3" />
              </span>
              <span className="text-[#334155]">5 ad angles + hooks</span>
            </li>
            <li className="flex items-start gap-3 text-sm">
              <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check className="size-3" />
              </span>
              <span className="text-[#334155]">Buyer psychology insights</span>
            </li>
            <li className="flex items-start gap-3 text-sm">
              <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check className="size-3" />
              </span>
              <span className="text-[#334155] font-medium">3 AI-generated ad creatives</span>
            </li>
            <li className="flex items-start gap-3 text-sm">
              <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check className="size-3" />
              </span>
              <span className="text-[#334155] font-medium">Meta Ads testing plan</span>
            </li>
            <li className="flex items-start gap-3 text-sm">
              <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check className="size-3" />
              </span>
              <span className="text-[#334155] font-medium">Creative ranking + launch order</span>
            </li>
          </ul>
        </div>

        {/* Deliverable preview */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
          <h3
            className="text-sm font-semibold text-[#0F172A] mb-4"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
          >
            Your full campaign package
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <div className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <ImageIcon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#0F172A]">3 ad creatives</p>
                <p className="text-xs text-[#64748B]">Image + headline + copy + CTA</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <div className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#0F172A]">Campaign Launch Plan</p>
                <p className="text-xs text-[#64748B]">Budget, launch order, and decision rules</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <div className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <BarChart3 className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#0F172A]">Creative ranking</p>
                <p className="text-xs text-[#64748B]">Which creative to test first and why</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <CheckoutButton />
        <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
          <Shield className="size-3.5" />
          <span>One-time $4.99 payment. Secure checkout via Stripe. No subscription.</span>
        </div>
        <p className="text-xs text-[#94A3B8]">
          You keep the Campaign Launch Plan forever.
        </p>
      </div>
    </div>
  );
}
