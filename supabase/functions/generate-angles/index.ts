// @ts-nocheck
// Edge Function: generate-angles
// The AI generates a fixed candidate pool of ten angle labels for every product
// and only writes hooks and rationales. Scoring, ranking, and top-5 selection are
// deterministic and computed in code from business rules and product-category
// boosts. Returns the top 5 priorities — no DB writes, no Storage access.

import { generateStructured } from "../_shared/openai-client.ts";
import { AdAnglesSchema, type AdAngles } from "../_shared/schemas.ts";

interface GenerateAnglesRequest {
  productContext: {
    name: string;
    category: string;
    description: string;
    keyBenefits: string[];
    audienceSignals: string[];
    priceRange: string;
  };
  buyerInsights: {
    buyerProfile: string;
    mainDesire: string;
    painPoints: string[];
    buyingTriggers: string[];
    objections: string[];
  };
}

type AngleLabel = AdAngles["angles"][number]["angleLabel"];

type ScoredAngle = AdAngles["angles"][number] & {
  score: number;
  criteria: AngleCriteria;
};

interface GenerateAnglesResponse {
  angles: ScoredAngle[];
}

interface AngleCriteria {
  purchaseIntent: number;
  audienceReach: number;
  creativePotential: number;
  emotionalStrength: number;
}

// Fixed candidate pool of ten angle labels. The AI must generate a hook and
// rationale for every label in this pool. The AI does not rank, score, or select.
const CANDIDATE_ANGLE_LABELS = [
  "pain_point",
  "convenience",
  "time_saving",
  "gift",
  "lifestyle",
  "emotional",
  "educational",
  "aspiration",
  "transformation",
  "social_proof",
] as const;

// Base deterministic scores per angle label (1-10 scale). The AI never ranks or
// scores angles — these values are stored in code so the same product always
// produces the same ranking.
const BASE_SCORES: Record<AngleLabel, AngleCriteria> = {
  pain_point: { purchaseIntent: 10, audienceReach: 9, creativePotential: 9, emotionalStrength: 8 },
  convenience: { purchaseIntent: 9, audienceReach: 9, creativePotential: 7, emotionalStrength: 5 },
  time_saving: { purchaseIntent: 8, audienceReach: 8, creativePotential: 7, emotionalStrength: 4 },
  gift: { purchaseIntent: 7, audienceReach: 8, creativePotential: 10, emotionalStrength: 10 },
  lifestyle: { purchaseIntent: 4, audienceReach: 7, creativePotential: 8, emotionalStrength: 6 },
  emotional: { purchaseIntent: 4, audienceReach: 5, creativePotential: 6, emotionalStrength: 10 },
  educational: { purchaseIntent: 3, audienceReach: 4, creativePotential: 5, emotionalStrength: 3 },
  aspiration: { purchaseIntent: 5, audienceReach: 6, creativePotential: 9, emotionalStrength: 9 },
  transformation: { purchaseIntent: 6, audienceReach: 7, creativePotential: 10, emotionalStrength: 7 },
  social_proof: { purchaseIntent: 7, audienceReach: 6, creativePotential: 6, emotionalStrength: 4 },
};

const SCORE_WEIGHTS = {
  purchaseIntent: 0.40,
  audienceReach: 0.25,
  creativePotential: 0.20,
  emotionalStrength: 0.15,
};

// Product-category boosts applied deterministically to the final score of the
// named angle. Detection is heuristic and case-insensitive across category,
// name, description, benefits, and audience signals.
const CATEGORY_BOOSTS: Record<string, Partial<Record<AngleLabel, number>>> = {
  robot_vacuum: { pain_point: 1, convenience: 1, time_saving: 1 },
  giftable: { gift: 2 },
  fitness: { transformation: 2, aspiration: 1 },
  educational_toy: { educational: 2, emotional: 1 },
  beauty: { transformation: 2, aspiration: 2 },
};

function calculateScore(criteria: AngleCriteria): number {
  const weighted =
    criteria.purchaseIntent * SCORE_WEIGHTS.purchaseIntent +
    criteria.audienceReach * SCORE_WEIGHTS.audienceReach +
    criteria.creativePotential * SCORE_WEIGHTS.creativePotential +
    criteria.emotionalStrength * SCORE_WEIGHTS.emotionalStrength;
  return Math.round(weighted * 10) / 10;
}

function detectCategoryTags(productContext: GenerateAnglesRequest["productContext"]): string[] {
  const text = [
    productContext.category,
    productContext.name,
    productContext.description,
    ...productContext.keyBenefits,
    ...productContext.audienceSignals,
  ]
    .join(" ")
    .toLowerCase();

  const tags: string[] = [];

  if (text.includes("robot vacuum") || text.includes("robotic vacuum") || (text.includes("robot") && text.includes("vacuum"))) {
    tags.push("robot_vacuum");
  }
  if (text.includes("gift") || text.includes("present")) {
    tags.push("giftable");
  }
  if (
    text.includes("fitness") ||
    text.includes("workout") ||
    text.includes("exercise") ||
    text.includes("gym") ||
    text.includes("blender")
  ) {
    tags.push("fitness");
  }
  if (
    text.includes("educational toy") ||
    (text.includes("toy") && (text.includes("educational") || text.includes("learning") || text.includes("stem")))
  ) {
    tags.push("educational_toy");
  }
  if (
    text.includes("beauty") ||
    text.includes("cosmetic") ||
    text.includes("skincare") ||
    text.includes("makeup")
  ) {
    tags.push("beauty");
  }

  return tags;
}

function applyBoosts(
  angles: AdAngles["angles"],
  productContext: GenerateAnglesRequest["productContext"]
): ScoredAngle[] {
  const tags = detectCategoryTags(productContext);
  const boosts = tags.reduce((acc, tag) => {
    const tagBoosts = CATEGORY_BOOSTS[tag];
    if (!tagBoosts) return acc;
    for (const [label, boost] of Object.entries(tagBoosts)) {
      acc[label as AngleLabel] = (acc[label as AngleLabel] ?? 0) + boost;
    }
    return acc;
  }, {} as Record<AngleLabel, number>);

  return angles.map((angle) => {
    const criteria = BASE_SCORES[angle.angleLabel];
    const boost = boosts[angle.angleLabel] ?? 0;
    return {
      ...angle,
      criteria,
      score: Math.round((calculateScore(criteria) + boost) * 10) / 10,
    };
  });
}

function selectTopAngles(scored: ScoredAngle[]): ScoredAngle[] {
  return [...scored]
    .sort((a, b) => b.score - a.score || CANDIDATE_ANGLE_LABELS.indexOf(a.angleLabel) - CANDIDATE_ANGLE_LABELS.indexOf(b.angleLabel))
    .slice(0, 5);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: GenerateAnglesRequest;
  try {
    body = await req.json() as GenerateAnglesRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.productContext || !body.buyerInsights) {
    return new Response(
      JSON.stringify({ error: "productContext and buyerInsights are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const result = await generateStructured(AdAnglesSchema, [
      {
        role: "system",
        content:
          "You are an expert ad creative strategist.\n\nYou must generate ad angles using EXACTLY these ten candidate angle labels, in this exact order:\n\n1. pain_point\n2. convenience\n3. time_saving\n4. gift\n5. lifestyle\n6. emotional\n7. educational\n8. aspiration\n9. transformation\n10. social_proof\n\nDo not add, remove, rename, replace, reorder, score, rank, or rate the angles.\n\nFor each candidate angle, generate:\n\n* one strong hook\n* one brief rationale explaining why this angle works for this product\n\nReturn exactly ten angles in the same order.\n\nScoring, ranking, and top-5 selection are handled separately by the backend.",
      },
      {
        role: "user",
        content:
          `Product context:\n${JSON.stringify(body.productContext, null, 2)}\n\nBuyer insights:\n${JSON.stringify(body.buyerInsights, null, 2)}\n\nGenerate exactly ten ad angles using ONLY these labels and in this exact order:\n\n1. pain_point\n2. convenience\n3. time_saving\n4. gift\n5. lifestyle\n6. emotional\n7. educational\n8. aspiration\n9. transformation\n10. social_proof\n\nFor each angle return:\n\n* angleLabel\n* hook\n* rationale\n\nDo not include:\n\n* scores\n* rankings\n* priorities\n* alternative angle labels\n* additional angles`,
      },
    ]);

    // Re-order the AI output to match the fixed candidate order so the response
    // is deterministic regardless of how the model orders its output.
    const byLabel = new Map(result.angles.map((a) => [a.angleLabel, a]));
    const orderedAngles = CANDIDATE_ANGLE_LABELS.map((label) => byLabel.get(label)!).filter(Boolean);

    // Apply deterministic base scores and product-category boosts, then select
    // the top 5 priorities. The AI never scores or ranks angles.
    const scoredAngles = applyBoosts(orderedAngles, body.productContext);
    const topAngles = selectTopAngles(scoredAngles);

    const response: GenerateAnglesResponse = { angles: topAngles };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("generate-angles error:", message);
    return new Response(
      JSON.stringify({ error: "Failed to generate ad angles", detail: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
