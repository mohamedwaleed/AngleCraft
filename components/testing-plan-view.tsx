"use client";

import { CopyButton } from "@/components/copy-button";
import type { TestingPlanContent } from "@/lib/types";

interface TestingPlanViewProps {
  plan: TestingPlanContent;
}

function formatPlanText(plan: TestingPlanContent): string {
  if (!plan.campaignStrategy || !plan.recommendedTestingSetup) {
    return [
      "AI Creative Strategist — Campaign Launch Plan",
      "",
      "This Campaign Launch Plan was generated with an older format.",
      "Please refresh or start a new session to get the updated Meta Ads strategy.",
    ].join("\n");
  }

  const setup = plan.recommendedTestingSetup;
  const sc = plan.successCriteria;

  const lines: string[] = [
    "AI Creative Strategist — Campaign Launch Plan",
    "",
    `Platform: ${plan.campaignStrategy.primaryPlatform}`,
    `Primary Placement: ${plan.campaignStrategy.primaryPlacement}`,
    `Can also be tested on: ${plan.creativeStrategies[0]?.secondaryPlacement ?? "Instagram Feed"}`,
    "",
    "RECOMMENDED TESTING SETUP",
    `Approach: ${setup.approach}`,
    `Campaign Objective: ${setup.campaignObjective}`,
    `Creatives: ${setup.creatives.map((i) => `Creative #${i}`).join(", ")}`,
    `Budget: Minimum ${setup.budget.minimum}, Recommended ${setup.budget.recommended}`,
    `Run Time: ${setup.runTime}`,
    `Monitor: ${setup.monitor.join(", ")}`,
    "",
    "After testing:",
    ...setup.afterTesting.map((s) => `• ${s}`),
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

  if (plan.targetCpa) {
    lines.push(
      "",
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

  if (!plan.recommendedTestingSetup || !plan.campaignStrategy) {
    return (
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xl p-6 sm:p-8">
        <h3
          className="text-xl sm:text-2xl font-bold text-[#0F172A] mb-4"
          style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
        >
          Recommended Testing Setup
        </h3>
        <p className="text-sm text-[#64748B]">
          This testing setup was generated with an older format. Refresh the page or start a new session to see the updated Meta Ads testing plan.
        </p>
      </div>
    );
  }

  const setup = plan.recommendedTestingSetup;

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xl p-6 sm:p-8 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h3
          className="text-xl sm:text-2xl font-bold text-[#0F172A]"
          style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
        >
          Recommended Testing Setup
        </h3>
        <CopyButton text={planText} />
      </div>

      {/* Setup */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-[#94A3B8]">
          Recommended Testing Setup
        </h4>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5">
          <p className="text-sm font-bold text-[#0F172A] mb-4">{setup.approach}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="rounded-lg bg-white border border-indigo-100 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-1">
                Campaign Objective
              </p>
              <p className="text-sm text-[#0F172A]">{setup.campaignObjective}</p>
            </div>
            <div className="rounded-lg bg-white border border-indigo-100 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-1">
                Run Time
              </p>
              <p className="text-sm text-[#0F172A]">{setup.runTime}</p>
            </div>
          </div>
          <div className="rounded-lg bg-white border border-indigo-100 p-3 mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-1.5">
              Creatives
            </p>
            <div className="flex flex-wrap gap-1.5">
              {setup.creatives.map((idx) => (
                <span
                  key={idx}
                  className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700"
                >
                  Creative #{idx}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
            <div className="rounded-lg bg-white border border-indigo-100 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-1">
                Minimum Budget
              </p>
              <p className="text-sm text-[#0F172A]">{setup.budget.minimum}</p>
            </div>
            <div className="rounded-lg bg-white border border-indigo-100 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-1">
                Recommended Budget
              </p>
              <p className="text-sm text-[#0F172A]">{setup.budget.recommended}</p>
            </div>
          </div>
          <div className="rounded-lg bg-white border border-indigo-100 p-3 mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-1.5">
              Monitor
            </p>
            <div className="flex flex-wrap gap-1.5">
              {setup.monitor.map((kpi) => (
                <span
                  key={kpi}
                  className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700"
                >
                  {kpi}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-white border border-indigo-100 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-1.5">
              After Testing
            </p>
            <ul className="space-y-1.5">
              {setup.afterTesting.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#0F172A]">
                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

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
