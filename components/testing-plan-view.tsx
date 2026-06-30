"use client";

import { CopyButton } from "@/components/copy-button";
import type { SuccessCriteria, TestingPlanContent } from "@/lib/types";

interface TestingPlanViewProps {
  plan: TestingPlanContent;
}

function SuccessSignals({ criteria }: { criteria: SuccessCriteria }) {
  return (
    <div className="rounded-lg bg-white border border-indigo-100 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-2">
        Success Signals
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
            Purchases
          </p>
          <p className="text-xs font-medium text-[#0F172A]">{criteria.purchases.goal}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
            Cost Per Purchase
          </p>
          <p className="text-xs font-medium text-[#0F172A]">{criteria.costPerPurchase.goal}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">CTR</p>
          <p className="text-xs font-medium text-emerald-700">Good: {criteria.ctr.good}</p>
          <p className="text-[11px] text-[#64748B]">
            Average: {criteria.ctr.average} · Poor: {criteria.ctr.poor}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">CPC</p>
          <p className="text-xs font-medium text-emerald-700">Good: {criteria.cpc.good}</p>
          <p className="text-[11px] text-[#64748B]">
            Average: {criteria.cpc.average} · Poor: {criteria.cpc.poor}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatPlanText(plan: TestingPlanContent): string {
  if (!plan.campaignStrategy || !plan.testingPlan) {
    return [
      "AI Creative Strategist — Campaign Launch Plan",
      "",
      "This Campaign Launch Plan was generated with an older format.",
      "Please refresh or start a new session to get the updated Meta Ads strategy.",
    ].join("\n");
  }

  const p1 = plan.testingPlan.phase1;
  const p2 = plan.testingPlan.phase2;
  const p3 = plan.testingPlan.phase3;
  const sc = plan.successCriteria;

  const lines: string[] = [
    "AI Creative Strategist — Campaign Launch Plan",
    "",
    `Platform: ${plan.campaignStrategy.primaryPlatform}`,
    `Primary Placement: ${plan.campaignStrategy.primaryPlacement}`,
    `Can also be tested on: ${plan.creativeStrategies[0]?.secondaryPlacement ?? "Instagram Feed"}`,
    "",
    "PHASE 1",
    ...p1.create.map((s) => `✓ ${s}`),
    `✓ Upload ${p1.upload}`,
    `✓ Run: ${p1.run}`,
    `Evaluate: ${p1.evaluate.join(", ")}`,
    `Decision: ${p1.decision}`,
  ];

  if (sc) {
    lines.push(
      "",
      "SUCCESS SIGNALS",
      `Purchases — ${sc.purchases.goal}`,
      `CTR — Good: ${sc.ctr.good}, Average: ${sc.ctr.average}, Poor: ${sc.ctr.poor}`,
      `CPC — Good: ${sc.cpc.good}, Average: ${sc.cpc.average}, Poor: ${sc.cpc.poor}`,
      `Cost Per Purchase — ${sc.costPerPurchase.goal}`,
      "",
      "DECISION RULES",
      `${sc.decisionRules.condition}. ${sc.decisionRules.action}`
    );
  }

  lines.push(
    "",
    "PHASE 2",
    `✓ ${p2.pause}`,
    `✓ ${p2.upload}`,
    `✓ Run: ${p2.run}`,
    `Evaluate: ${p2.evaluate}`,
    "",
    "PHASE 3",
    `✓ ${p3.condition}`,
    `✓ ${p3.upload}`,
    `✓ Run: ${p3.run}`,
    ""
  );

  if (plan.targetCpa) {
    lines.push(
      "TARGET CPA",
      `Recommended maximum: ${plan.targetCpa.formatted}`,
      ""
    );
  }

  if (plan.testingIntensity) {
    lines.push(
      "TESTING INTENSITY",
      `Minimum Validation: ${plan.testingIntensity.minimum}`,
      `Recommended Validation: ${plan.testingIntensity.recommended}`,
      `Fast Validation: ${plan.testingIntensity.fast}`,
      "",
      plan.testingIntensity.explanation,
      ""
    );
  }

  return lines.join("\n");
}

export function TestingPlanView({ plan }: TestingPlanViewProps) {
  const planText = formatPlanText(plan);

  if (!plan.testingPlan || !plan.campaignStrategy) {
    return (
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xl p-6 sm:p-8">
        <h3
          className="text-xl sm:text-2xl font-bold text-[#0F172A] mb-4"
          style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
        >
          Campaign Launch Plan
        </h3>
        <p className="text-sm text-[#64748B]">
          This Campaign Launch Plan was generated with an older format. Refresh the page or start a new session to see the updated Meta Ads testing plan.
        </p>
      </div>
    );
  }

  const p1 = plan.testingPlan.phase1;
  const p2 = plan.testingPlan.phase2;
  const p3 = plan.testingPlan.phase3;

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xl p-6 sm:p-8 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h3
          className="text-xl sm:text-2xl font-bold text-[#0F172A]"
          style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
        >
          Campaign Launch Plan
        </h3>
        <CopyButton text={planText} />
      </div>

      {/* Phases */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-[#94A3B8]">
          Testing Plan
        </h4>

        {/* Phase 1 */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex size-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
              1
            </span>
            <p className="text-sm font-bold text-[#0F172A]">Phase 1 — First 3 Days</p>
          </div>
          <ul className="space-y-1.5 mb-4">
            {[...p1.create, `Upload ${p1.upload}`, `Run: ${p1.run}`].map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#0F172A]">
                <span className="text-emerald-600 font-bold shrink-0">✓</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-lg bg-white border border-indigo-100 p-3 mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-1.5">
              Evaluate
            </p>
            <div className="flex flex-wrap gap-1.5">
              {p1.evaluate.map((kpi) => (
                <span
                  key={kpi}
                  className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700"
                >
                  {kpi}
                </span>
              ))}
            </div>
          </div>
          {plan.successCriteria && (
            <div className="mb-3">
              <SuccessSignals criteria={plan.successCriteria} />
            </div>
          )}
          <div className="rounded-lg bg-white border border-indigo-100 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-1">
              Decision
            </p>
            <p className="text-xs text-[#0F172A]">{p1.decision}</p>
          </div>
        </div>

        {/* Phase 2 */}
        <div className="rounded-xl border border-[#E2E8F0] p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex size-6 items-center justify-center rounded-full bg-slate-400 text-[11px] font-bold text-white">
              2
            </span>
            <p className="text-sm font-bold text-[#0F172A]">Phase 2 — If Phase 1 Does Not Win</p>
          </div>
          <ul className="space-y-1.5 mb-3">
            {[`${p2.pause}`, `${p2.upload}`, `Run: ${p2.run}`].map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#0F172A]">
                <span className="text-emerald-600 font-bold shrink-0">✓</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-[#64748B]">Evaluate: {p2.evaluate}</p>
          {plan.successCriteria && (
            <div className="mt-3">
              <SuccessSignals criteria={plan.successCriteria} />
            </div>
          )}
        </div>

        {/* Phase 3 */}
        <div className="rounded-xl border border-[#E2E8F0] p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-slate-300 text-[11px] font-bold text-white">
              3
            </span>
            <p className="text-sm font-bold text-[#0F172A]">Phase 3 — If Needed</p>
          </div>
          <p className="text-sm text-[#64748B]">{p3.condition}</p>
          <p className="text-sm text-[#64748B] mt-1">
            {p3.upload} — Run {p3.run}.
          </p>
          {plan.successCriteria && (
            <div className="mt-3">
              <SuccessSignals criteria={plan.successCriteria} />
            </div>
          )}
        </div>
      </div>

      {/* How Do I Know If This Is Working? */}
      {plan.successCriteria && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 sm:p-6">
          <h4 className="text-sm font-bold text-[#0F172A] mb-4">
            How Do I Know If This Is Working?
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold shrink-0">✓</span>
              <div>
                <p className="text-xs font-bold text-[#0F172A]">Purchases</p>
                <p className="text-xs text-[#64748B]">{plan.successCriteria.purchases.goal}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold shrink-0">✓</span>
              <div>
                <p className="text-xs font-bold text-[#0F172A]">Target CPA</p>
                {plan.targetCpa ? (
                  <p className="text-xs text-[#64748B]">
                    Recommended maximum: {plan.targetCpa.formatted}
                  </p>
                ) : (
                  <p className="text-xs text-[#64748B]">
                    Below the calculated target CPA.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold shrink-0">✓</span>
              <div>
                <p className="text-xs font-bold text-[#0F172A]">CTR</p>
                <p className="text-xs text-[#64748B]">
                  Good {plan.successCriteria.ctr.good} · Average {plan.successCriteria.ctr.average} · Poor {plan.successCriteria.ctr.poor}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold shrink-0">✓</span>
              <div>
                <p className="text-xs font-bold text-[#0F172A]">CPC</p>
                <p className="text-xs text-[#64748B]">
                  Good {plan.successCriteria.cpc.good} · Average {plan.successCriteria.cpc.average} · Poor {plan.successCriteria.cpc.poor}
                </p>
              </div>
            </div>
            <div className="sm:col-span-2 flex items-start gap-2 rounded-lg bg-white border border-emerald-100 p-3">
              <span className="text-emerald-600 font-bold shrink-0">✓</span>
              <div>
                <p className="text-xs font-bold text-[#0F172A]">Scale / Pause decision</p>
                <p className="text-xs text-[#64748B]">
                  {plan.successCriteria.decisionRules.condition}. {plan.successCriteria.decisionRules.action}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Testing Intensity */}
      {plan.testingIntensity && (
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-[#94A3B8] mb-1">
            Testing Intensity
          </h4>
          <p className="text-xs text-[#64748B] mb-3">
            {plan.testingIntensity.explanation}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[#E2E8F0] p-4">
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                Minimum Validation
              </p>
              <p className="text-lg font-bold text-[#0F172A]">{plan.testingIntensity.minimum}</p>
            </div>
            <div className="rounded-xl border border-[#E2E8F0] p-4">
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                Recommended Validation
              </p>
              <p className="text-lg font-bold text-[#0F172A]">{plan.testingIntensity.recommended}</p>
            </div>
            <div className="rounded-xl border border-[#E2E8F0] p-4">
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                Fast Validation
              </p>
              <p className="text-lg font-bold text-[#0F172A]">{plan.testingIntensity.fast}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
