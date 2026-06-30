// @ts-nocheck
// Edge Function: generate-testing-plan
// Builds a single, deterministic Meta Ads campaign strategy and derives every
// report section from it. The AI never picks the winner, ranks angles, invents
// campaign names, or sets budgets — those are fixed in code. No DB writes.

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

const CAMPAIGN_TYPE = "Meta Sales Campaign";
const AUDIENCE_STRATEGY = "Start with broad targeting.";
const AUDIENCE_EXPLANATION =
  "Broad targeting allows Meta's algorithm to identify the strongest audience response before narrowing targeting.";
const OPTIMIZATION_GOAL = "Purchases";
const OPTIMIZATION_REASON =
  "Select the Sales objective optimized for purchases so Meta's algorithm optimizes for buyers, not clicks.";

const BUDGET_DISCLAIMER =
  "Testing budgets are based on common e-commerce creative testing practices and should be adjusted to your market, product pricing, and business goals.";

const WHY_WINNER_BULLETS = [
  "Strongest purchase intent",
  "Broadest audience appeal",
  "Strong emotional trigger",
  "Best visual storytelling opportunity",
];

const SUCCESS_CRITERIA = {
  purchases: { goal: "At least 1 purchase during the testing period" },
  ctr: { good: ">1.5%", average: "0.8% - 1.5%", poor: "<0.8%" },
  cpc: { good: "<$1.00", average: "$1 - $2", poor: ">$2" },
  costPerPurchase: { goal: "Below the calculated target CPA" },
  decisionRules: {
    condition:
      "After 3 days: purchases ≥ 1, CTR > 1.5%, and CPC within the good or average range",
    action:
      "Scale budget by 20-30%. Otherwise, pause the creative and move to the next recommended creative.",
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
    recommendedWinner: priorities[0],
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
  const winner = creatives.find((c) => c.index === strategy.recommendedWinner);
  const winnerName = winner
    ? ANGLE_CATEGORY_MAP[winner.angleLabel] ?? winner.angleLabel
    : `Creative #${strategy.recommendedWinner}`;

  return `Master campaign strategy (derive every field from this object):

${JSON.stringify(strategy, null, 2)}

Creative priority order: ${strategy.creativePriorities
    .map((idx) => `Creative #${idx}`)
    .join(" → ")}
Recommended first test: Creative #${strategy.recommendedWinner} (${winnerName}).
Primary platform: ${strategy.primaryPlatform}.
Primary placement: ${strategy.primaryPlacement}.
Can also be tested on: ${SECONDARY_PLACEMENT}.
Testing duration: ${strategy.testingDurationDays} days per creative.
Evaluation metrics: ${strategy.evaluationMetrics.join(", ")}.

Follow this strategy exactly. Do not pick a different winner or reorder priorities. Every section below must be consistent with the master strategy object. Do not invent campaign names, audience targeting names, budget numbers, or performance predictions. Do not reference TikTok or any platform other than Meta Ads (Facebook and Instagram).`;
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
  const [winnerIndex, secondIndex, thirdIndex] = campaignStrategy.creativePriorities;

  try {
    const result = await generateStructured(TestingPlanSchema, [
      {
        role: "system",
        content:
          "You are a senior performance marketer and creative strategist. Your job is to produce ONE unified Meta Ads testing playbook that an e-commerce founder can act on immediately — not a generic AI report.\n\nFocus exclusively on Meta Ads (Facebook and Instagram). The testing workflow is: one Meta Sales campaign, one broad ad set, one creative at a time, 3 days per creative. Never reference TikTok or any other ad platform.\n\nNever invent campaign names, specific performance targets, CTR percentages, CPC values, ROAS assumptions, or exact conversion predictions. Instead, name the KPIs to monitor and explain why each matters.\n\nBe specific, confident, and use plain language. Avoid vague or AI-sounding phrases like 'may drive' or 'could potentially'. Write like a strategist presenting a ready-to-run test plan to a client.",
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
          )}\n\n${strategyPrompt(campaignStrategy, body.creatives)}\n\nGenerate a unified Meta Ads testing playbook. Return ONE JSON object matching the TestingPlan schema with these sections:\n\n1. campaignStrategy: copy the master strategy object above exactly.\n2. customerInsights: targetBuyer, mainPain, mainDesire, mainBuyingTrigger, mainObjection, and mostImportantBuyerEmotion (one sentence capturing the core emotion).\n3. recommendedFirstTest: creativeIndex must be ${winnerIndex}. creativeName should be the angle category in plain language. Include why (psychology reason), expectedOutcome (short narrative, no numbers), selectionRationale (2-4 bullets), and runOn ("${PRIMARY_PLATFORM} — ${PRIMARY_PLACEMENT} + ${SECONDARY_PLACEMENT}").\n4. actionPlan: platform ("${PRIMARY_PLATFORM}"), campaignType ("${CAMPAIGN_TYPE}"), audienceStrategy ("${AUDIENCE_STRATEGY}"), audienceExplanation ("${AUDIENCE_EXPLANATION}"), optimizationGoal ("${OPTIMIZATION_GOAL}"), optimizationReason ("${OPTIMIZATION_REASON}"), firstCreative ("Creative #${winnerIndex}"), budget ("Selected testing budget — see Testing Intensity below"), run ("${TESTING_DURATION_DAYS} days"), monitor (the four evaluation metrics), decision (if Creative #${winnerIndex} performs poorly, move to Creative #${secondIndex}).\n5. creativeStrategies: for each creative index in priority order [${winnerIndex}, ${secondIndex}, ${thirdIndex}], provide angleLabel (match the creative), angleCategory (one of the plain-language categories based on the angleLabel), psychology (target emotion/trigger), primaryPlacement ("${PRIMARY_PLACEMENT}"), secondaryPlacement ("${SECONDARY_PLACEMENT}"), testingPriority (1, 2, 3 in priority order), bestUseCase (one of: Cold traffic, Broad testing, Retargeting), reasonToTest (one sentence).\n6. testingIntensity: minimum "$20/day", recommended "$50/day", fast "$100/day", and an explanation that budgets are based on common e-commerce testing practices and should be adjusted to the market and business goals.\n7. testingPlan: phase1 (create one Meta Sales campaign + one broad ad set, upload Creative #${winnerIndex}, run 3 days, evaluate the four metrics, decision: if Creative #${winnerIndex} generates purchases at an acceptable cost increase budget gradually; if it generates clicks but no purchases test the next creative; if it performs poorly pause and move to the next creative), phase2 (pause Creative #${winnerIndex}, upload Creative #${secondIndex}, run 3 days, evaluate again), phase3 (if needed, upload Creative #${thirdIndex}, run 3 days).\n8. whyNotOthers: one entry for each non-winning creative (Creative #${secondIndex} and Creative #${thirdIndex}), with a one-sentence reason why it is recommended later in the sprint.\n9. whyWinner: the four reasons the winner was selected systematically (strongest purchase intent, broadest audience appeal, strong emotional trigger, best visual storytelling opportunity).\n10. workflow: day1 (launch Creative #${winnerIndex}), day4 (review purchases, cost per purchase, CTR, and CPC), ifWinner (increase budget gradually), ifLoser (return to this playbook and launch Creative #${secondIndex}), ifNone (pause all and revisit the angles before retesting).\n11. disclaimer: a one-sentence note that this playbook is a starting framework and results depend on the product, market, and execution.
12. successCriteria: include the benchmark success thresholds for Purchases, CTR (good/average/poor), CPC (good/average/poor), Cost Per Purchase, and the decision rules after 3 days.
13. targetCpa: include sellingPrice, recommendedMaximum (calculated as sellingPrice * 0.35), and formatted string as "<$XX". If no selling price is provided, set formatted to "Add your product price to see a target CPA."`,
      },
    ]);

    // Enforce deterministic structural consistency against the master strategy.
    // These fields are NEVER left to the AI — they are fixed in code so the
    // same product always produces the same playbook shape.
    const finalPlan: TestingPlan = {
      ...result,
      campaignStrategy,
      recommendedFirstTest: {
        ...result.recommendedFirstTest,
        creativeIndex: winnerIndex,
      },
      actionPlan: {
        ...result.actionPlan,
        platform: PRIMARY_PLATFORM,
        campaignType: CAMPAIGN_TYPE,
        audienceStrategy: AUDIENCE_STRATEGY,
        audienceExplanation: AUDIENCE_EXPLANATION,
        optimizationGoal: OPTIMIZATION_GOAL,
        optimizationReason: OPTIMIZATION_REASON,
        firstCreative: `Creative #${winnerIndex}`,
        decision: `If Creative #${winnerIndex} performs poorly, move to Creative #${secondIndex}.`,
      },
      whyWinner: WHY_WINNER_BULLETS,
      testingIntensity: {
        ...result.testingIntensity,
        minimum: "$20/day",
        recommended: "$50/day",
        fast: "$100/day",
        explanation: BUDGET_DISCLAIMER,
      },
      testingPlan: {
        phase1: {
          ...result.testingPlan.phase1,
          upload: `Creative #${winnerIndex}`,
          evaluate: EVALUATION_METRICS,
          decision:
            `If Creative #${winnerIndex} generates purchases at an acceptable cost, increase budget gradually. ` +
            `If it generates clicks but no purchases, test the next creative. ` +
            `If it performs poorly, pause and move to the next creative.`,
        },
        phase2: {
          ...result.testingPlan.phase2,
          pause: `Creative #${winnerIndex}`,
          upload: `Creative #${secondIndex}`,
        },
        phase3: {
          ...result.testingPlan.phase3,
          upload: `Creative #${thirdIndex}`,
        },
      },
      successCriteria: SUCCESS_CRITERIA,
      targetCpa: buildTargetCpa(body.sellingPrice),
    };

    // Re-order creative strategies so the priority order matches the strategy.
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

    // Re-order whyNotOthers to match the non-winning creatives.
    const winnerReasons = new Map(
      result.whyNotOthers.map((w) => [w.creativeIndex, w.reason])
    );
    finalPlan.whyNotOthers = [secondIndex, thirdIndex].map((idx) => ({
      creativeIndex: idx,
      reason:
        winnerReasons.get(idx) ??
        "Recommended later in the testing sprint based on priority.",
    }));

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
