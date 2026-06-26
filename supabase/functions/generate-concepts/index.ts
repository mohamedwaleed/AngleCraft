// Edge Function: generate-concepts
// AI-only: receives product context + buyer insights + 3 selected angles with
// hooks, calls OpenAI with AdConceptsSchema, returns 3 concepts — no DB writes.

import { generateStructured } from "../_shared/openai-client.ts";
import { AdConceptsSchema, type AdConcepts } from "../_shared/schemas.ts";

interface GenerateConceptsRequest {
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
  selectedAngles: {
    angleLabel: string;
    hook: string;
    score: number;
  }[];
}

interface GenerateConceptsResponse {
  concepts: AdConcepts["concepts"];
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: GenerateConceptsRequest;
  try {
    body = await req.json() as GenerateConceptsRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.productContext || !body.buyerInsights || !body.selectedAngles || body.selectedAngles.length === 0) {
    return new Response(
      JSON.stringify({ error: "productContext, buyerInsights, and selectedAngles are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const result = await generateStructured(AdConceptsSchema, [
      {
        role: "system",
        content:
          "You are an expert ad creative strategist. Given a product, buyer insights, and three selected ad angles (each with a hook), generate exactly one creative concept per angle. Each concept should describe a full creative approach for a social media ad — the visual direction, the messaging angle, the emotional hook, and the tone. Be specific and actionable.",
      },
      {
        role: "user",
        content:
          `Product context:\n${JSON.stringify(body.productContext, null, 2)}\n\nBuyer insights:\n${JSON.stringify(body.buyerInsights, null, 2)}\n\nSelected angles:\n${JSON.stringify(body.selectedAngles, null, 2)}\n\nGenerate exactly three ad concepts — one for each selected angle. Each must include the angleLabel matching the input.`,
      },
    ]);

    const response: GenerateConceptsResponse = { concepts: result.concepts };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("generate-concepts error:", message);
    return new Response(
      JSON.stringify({ error: "Failed to generate ad concepts", detail: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
