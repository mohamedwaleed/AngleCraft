// @ts-nocheck
// Edge Function: generate-testing-plan
// Builds a single, deterministic Meta Ads testing strategy and derives every
// report section from it. The AI never picks a predicted winner, ranks angles,
// invents campaign names, or sets budgets — those are fixed in code. No DB
// writes.

import { generateStructured } from "../_shared/openai-client.ts";
import { TestingPlanSchema, type TestingPlan } from "../_shared/schemas.ts";

interface GenerateTestingPlanRequest {
  productContext: {
    name: string;
    category: string;
    description: string;
    keyBenefits: string[];
    audienceSignals: string[];
    priceRange: string;
  };
  sellingPrice?: number;
  buyerInsights: {
    buyerProfile: string;
    mainDesire: string;
    painPoints: string[];
    buyingTriggers: string[];
    objections: string[];
  };
  angles: {
    angleLabel: string;
    hook: string;
    rationale: string;
    score: number;
    isSelected: boolean;
  }[];
  creatives: {
    index: number;
    angleLabel: string;
    headline: string;
    primaryText: string;
    cta: string;
    concept: string;
  }[];
}

interface GenerateTestingPlanResponse {
  testingPlan: TestingPlan;
}

const PRIMARY_PLATFORM = "Meta Ads";
const PRIMARY_PLACEMENT = "Meta Feed";
const SECONDARY_PLACEMENT = "Instagram Feed";
const TESTING_DURATION_DAYS = 3;
const EVALUATION_METRICS = ["Purchases", "Cost Per Purchase", "CTR", "CPC"];

const BUDGET_DISCLAIMER =
  "Testing budgets are based on common e-commerce creative testing practices and should be adjusted to your market, product pricing, and business goals.";

const SUCCESS_CRITERIA = {
  purchases: { goal: "At least 1 purchase during the testing period" },
  ctr: { good: ">1.5%", average: "0.8% - 1.5%", poor: "<0.8%" },
  cpc: { good: "<$1.00", average: "$1 - $2", poor: ">$2" },
  costPerPurchase: { goal: "Below the calculated target CPA" },
  decisionRules: {
    condition:
      "After 3 days: purchases ≥ 1, CTR > 1.5%, and CPC within the good or average range",
    action:
      "Scale budget on the strongest performer by 20-30%. Pause the weakest performer and generate new angles if none perform.",
  },
};

function buildTargetCpa(sellingPrice?: number) {
  if (!sellingPrice || sellingPrice <= 0) {
    return {
      sellingPrice: 0,
      recommendedMaximum: 0,
      formatted: "Add your product price to see a target CPA.",
    };
  }
  const recommendedMaximum = Math.round(sellingPrice * 0.35);
  return {
    sellingPrice,
    recommendedMaximum,
    formatted: `<$${recommendedMaximum}`,
  };
}

// Map every taxonomy angle to a plain-language category for the report.
const ANGLE_CATEGORY_MAP: Record<
  string,
  "Pain Point" | "Convenience" | "Emotional" | "Educational" | "Social Proof" | "Aspirational"
> = {
  pain_point: "Pain Point",
  convenience: "Convenience",
  time_saving: "Convenience",
  gift: "Emotional",
  lifestyle: "Aspirational",
  emotional: "Emotional",
  educational: "Educational",
  social_proof: "Social Proof",
  fear: "Emotional",
  aspiration: "Aspirational",
  status: "Aspirational",
  transformation: "Aspirational",
};

function buildCampaignStrategy(
  creatives: GenerateTestingPlanRequest["creatives"],
  angles: GenerateTestingPlanRequest["angles"]
) {
  const scoreByAngle = new Map(angles.map((a) => [a.angleLabel, a.score]));
  const creativesWithScore = creatives.map((c) => ({
    ...c,
    score: scoreByAngle.get(c.angleLabel) ?? 0,
  }));
  const sorted = [...creativesWithScore].sort((a, b) => b.score - a.score);
  const priorities = sorted.map((c) => c.index);

  return {
    creativePriorities: priorities,
    primaryPlatform: PRIMARY_PLATFORM,
    primaryPlacement: PRIMARY_PLACEMENT,
    testingDurationDays: TESTING_DURATION_DAYS,
    evaluationMetrics: EVALUATION_METRICS,
    phaseOrder: priorities,
  };
}

function strategyPrompt(
  strategy: ReturnType<typeof buildCampaignStrategy>,
  creatives: GenerateTestingPlanRequest["creatives"]
): string {
  const roleLabels = ["Primary Test Angle", "Secondary Test Angle", "Exploration Angle"];
  const creativeRoles = strategy.creativePriorities.map((idx, i) => {
    const creative = creatives.find((c) => c.index === idx);
    const name = creative
      ? ANGLE_CATEGORY_MAP[creative.angleLabel] ?? creative.angleLabel
      : `Creative #${idx}`;
    return `${roleLabels[i]}: Creative #${idx} (${name})`;
  });

  return `Master campaign strategy (derive every field from this object):

${JSON.stringify(strategy, null, 2)}

Creative testing roles: ${creativeRoles.join(" | ")}
Primary platform: ${strategy.primaryPlatform}.
Primary placement: ${strategy.primaryPlacement}.
Can also be tested on: ${SECONDARY_PLACEMENT}.
Testing duration: ${strategy.testingDurationDays} days minimum.
Evaluation metrics: ${strategy.evaluationMetrics.join(", ")}.

Follow this strategy exactly. Do not predict future winners, claim one creative will outperform, or reorder testing roles. Every section below must be consistent with the master strategy object. Do not invent campaign names, audience targeting names, budget numbers, or performance predictions. Do not reference TikTok or any platform other than Meta Ads (Facebook and Instagram).`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: GenerateTestingPlanRequest;
  try {
    body = await req.json() as GenerateTestingPlanRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (
    !body.productContext ||
    !body.buyerInsights ||
    !body.angles ||
    body.angles.length === 0 ||
    !body.creatives ||
    body.creatives.length === 0
  ) {
    return new Response(
      JSON.stringify({
        error:
          "productContext, buyerInsights, angles, and creatives are required",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const campaignStrategy = buildCampaignStrategy(body.creatives, body.angles);
  const [priorityOneIndex, secondIndex, thirdIndex] = campaignStrategy.creativePriorities;

  try {
    const result = await generateStructured(TestingPlanSchema, [
      {
        role: "system",
        content:
          "You are a senior performance marketer and creative strategist. Your job is to produce ONE unified Meta Ads testing playbook that an e-commerce founder can act on immediately — not a generic AI report.\n\nAssign each generated creative a testing role: Primary Test Angle, Secondary Test Angle, or Exploration Angle. Roles are based on purchase intent strength, emotional intensity, audience breadth, visual stopping power, and likelihood of generating useful validation data. Do NOT claim that any creative is guaranteed to win. Do NOT predict future performance. Do NOT rank creatives as #1, #2, #3.\n\nFocus exclusively on Meta Ads (Facebook and Instagram). The testing workflow is: one Meta Sales campaign, one broad ad set, test all generated creatives together, 3 days minimum. Never reference TikTok or any other ad platform.\n\nNever invent campaign names, specific performance targets, CTR percentages, CPC values, ROAS assumptions, or exact conversion predictions. Instead, name the KPIs to monitor and explain why each matters.\n\nBe specific, confident, and use plain language. Avoid vague or AI-sounding phrases like 'may drive' or 'could potentially'. Write like a strategist presenting a ready-to-run test plan to a client.",
      },
      {
        role: "user",
        content:
          `Product context:\n${JSON.stringify(
            body.productContext,
            null,
            2
          )}\n\nBuyer insights:\n${JSON.stringify(
            body.buyerInsights,
            null,
            2
          )}\n\nAd angles (selected = true for the top 3):\n${JSON.stringify(
            body.angles,
            null,
            2
          )}\n\nReady-to-run creatives for the selected angles (index = Creative #N):\n${JSON.stringify(
            body.creatives,
            null,
            2
          )}\n\n${strategyPrompt(campaignStrategy, body.creatives)}\n\nGenerate a unified Meta Ads testing playbook. Return ONE JSON object matching the TestingPlan schema with these sections:\n\n1. campaignStrategy: copy the master strategy object above exactly.\n2. customerInsights: targetBuyer, mainPain, mainDesire, mainBuyingTrigger, mainObjection, and mostImportantBuyerEmotion (one sentence capturing the core emotion).\n3. creativeStrategies: for each creative index in priority order [${priorityOneIndex}, ${secondIndex}, ${thirdIndex}], provide angleLabel (match the creative), angleCategory (one of the plain-language categories based on the angleLabel), psychology (target emotion/trigger), primaryPlacement ("${PRIMARY_PLACEMENT}"), secondaryPlacement ("${SECONDARY_PLACEMENT}"), testingPriority (1, 2, 3 in priority order — the UI will map 1 to Primary Test Angle, 2 to Secondary Test Angle, 3 to Exploration Angle), bestUseCase (one of: Cold traffic, Broad testing, Retargeting), reasonToTest (one sentence).\n4. testingIntensity: minimum "$20/day", recommended "$50/day", fast "$100/day", and an explanation that budgets are based on common e-commerce testing practices and should be adjusted to the market and business goals.\n5. recommendedTestingSetup: approach ("Test all generated creatives together in one Meta Sales campaign."), campaignObjective ("Sales"), creatives ([1, 2, 3]), budget ({minimum: "$20/day", recommended: "$50/day"}), runTime ("3 days minimum"), monitor (the four evaluation metrics), afterTesting (three bullets: pause the weakest performer, increase budget on the strongest performer, generate new angles if none perform).\n6. workflow: day1 (launch all generated creatives), day4 (review purchases, cost per purchase, CTR, and CPC), ifPerforms (increase budget on the strongest performer), ifUnderperforms (generate new angles and retest), ifNone (pause all and revisit the angles before retesting).\n7. disclaimer: "AngleCraft provides strategic creative testing recommendations based on buyer psychology and advertising best practices. Creative roles indicate testing strategy and exploration order, not guaranteed performance predictions."\n8. successCriteria: include the benchmark success thresholds for Purchases, CTR (good/average/poor), CPC (good/average/poor), Cost Per Purchase, and the decision rules after 3 days.\n9. targetCpa: include sellingPrice, recommendedMaximum (calculated as sellingPrice * 0.35), and formatted string as "<$XX". If no selling price is provided, set formatted to "Add your product price to see a target CPA."`,
      },
    ]);

    // Enforce deterministic structural consistency against the master strategy.
    // These fields are NEVER left to the AI — they are fixed in code so the
    // same product always produces the same playbook shape.
    const finalPlan: TestingPlan = {
      ...result,
      campaignStrategy,
      testingIntensity: {
        ...result.testingIntensity,
        minimum: "$20/day",
        recommended: "$50/day",
        fast: "$100/day",
        explanation: BUDGET_DISCLAIMER,
      },
      recommendedTestingSetup: {
        approach:
          "Test all generated creatives together in one Meta Sales campaign.",
        campaignObjective: "Sales",
        creatives: [1, 2, 3],
        budget: {
          minimum: "$20/day",
          recommended: "$50/day",
        },
        runTime: "3 days minimum",
        monitor: EVALUATION_METRICS,
        afterTesting: [
          "Pause the weakest performer.",
          "Increase budget on the strongest performer.",
          "Generate new angles if none perform.",
        ],
      },
      workflow: {
        day1: "Launch all generated creatives.",
        day4: "Review: Purchases, Cost per Purchase, CTR, and CPC.",
        ifPerforms: "Increase budget.",
        ifUnderperforms: "Generate new angles and retest.",
        ifNone: "Pause all and revisit the angles before retesting.",
      },
      successCriteria: SUCCESS_CRITERIA,
      targetCpa: buildTargetCpa(body.sellingPrice),
      disclaimer:
        "AngleCraft provides strategic creative testing recommendations based on buyer psychology and advertising best practices. Creative roles indicate testing strategy and exploration order, not guaranteed performance predictions.",
    };

    // Re-order creative strategies so the testing role order matches the strategy.
    // Map by creativeIndex, not angleLabel, so two creatives never collapse into
    // one strategy even if they share an angle.
    const strategyByIndex = new Map(
      result.creativeStrategies.map((s) => [s.creativeIndex, s])
    );
    const reorderedStrategies = campaignStrategy.creativePriorities.map(
      (priorityIndex, i) => {
        const creative = body.creatives.find((c) => c.index === priorityIndex);
        const angleLabel = creative?.angleLabel ?? "";
        const generated = strategyByIndex.get(priorityIndex);
        return {
          creativeIndex: priorityIndex,
          angleLabel,
          angleCategory:
            ANGLE_CATEGORY_MAP[angleLabel] ??
            generated?.angleCategory ??
            "Convenience",
          psychology: generated?.psychology ?? "Tap the strongest buyer emotion.",
          primaryPlacement: generated?.primaryPlacement ?? PRIMARY_PLACEMENT,
          secondaryPlacement: generated?.secondaryPlacement ?? SECONDARY_PLACEMENT,
          testingPriority: i + 1,
          bestUseCase: generated?.bestUseCase ?? "Broad testing",
          reasonToTest: generated?.reasonToTest ?? "Validates the strongest angle first.",
        };
      }
    );
    finalPlan.creativeStrategies = reorderedStrategies;

    const response: GenerateTestingPlanResponse = { testingPlan: finalPlan };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("generate-testing-plan error:", message);
    return new Response(
      JSON.stringify({
        error: "Failed to generate testing plan",
        detail: message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
