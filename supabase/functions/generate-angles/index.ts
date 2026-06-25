// Edge Function: generate-angles
// AI-only: receives product context + buyer insights, calls OpenAI with
// AdAnglesSchema producing 5 angles with labels, hooks, rationale, and scores.
// Returns the array — no DB writes, no Storage access.

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

interface GenerateAnglesResponse {
  angles: AdAngles["angles"];
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
          "You are an expert ad creative strategist. Generate exactly five ad angles for this product, one for each of these categories: convenience, time_saving, pain_point, healthy_lifestyle, perfect_gift. For each angle, write one strong hook (a single attention-grabbing opening line), a brief rationale explaining why this angle works for this product, and score it from 1-100 based on likely effectiveness for this product and audience. Return all five angles in a single response.",
      },
      {
        role: "user",
        content:
          `Product context:\n${JSON.stringify(body.productContext, null, 2)}\n\nBuyer insights:\n${JSON.stringify(body.buyerInsights, null, 2)}\n\nGenerate exactly five ad angles — one for each label: convenience, time_saving, pain_point, healthy_lifestyle, perfect_gift. Each must have a hook, rationale, and a score (1-100).`,
      },
    ]);

    const response: GenerateAnglesResponse = { angles: result.angles };
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
