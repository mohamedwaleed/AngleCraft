// @ts-nocheck
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
          "You are an expert ad creative strategist and performance marketer. Given a product, buyer insights, and three selected ad angles, generate exactly one creative concept per angle. Each concept must describe a photorealistic, platform-native ad image that looks like it could be uploaded directly to Meta Ads Manager — not an abstract poster or illustration.\n\nFor each concept include:\n- creativeIndex: the 1-based index matching the input selected angle order (1, 2, or 3).\n- angleLabel: the exact angle label from the corresponding input selected angle.\n- concept: a vivid visual description of the shot (product in context, lighting, composition, mood). The image should look like a real paid social ad.\n- visualStyle: a concise label like 'photorealistic lifestyle shot', 'clean product close-up', 'authentic user-generated content style', or 'studio hero shot'.\n- placement: either 'Meta Feed' or 'Instagram Feed'.\n- aspectRatio: '1:1' or '4:5' for feed posts.\n\nReturn exactly three concepts in the same order as the selected angles, with creativeIndex 1 for the first selected angle, 2 for the second, and 3 for the third. Do not reuse the same angleLabel across concepts. Do not describe text-heavy posters. The image should be a scroll-stopping photo that a media buyer would run as a real Meta ad.",
      },
      {
        role: "user",
        content:
          `Product context:\n${JSON.stringify(body.productContext, null, 2)}\n\nBuyer insights:\n${JSON.stringify(body.buyerInsights, null, 2)}\n\nSelected angles (in order — concept 1 must use the first angle, concept 2 the second, concept 3 the third):\n${JSON.stringify(body.selectedAngles, null, 2)}\n\nGenerate exactly three ad concepts — one per selected angle, in the same order. Each must include creativeIndex (1, 2, or 3 matching the angle order), the matching angleLabel, a vivid photorealistic concept, a visualStyle, a placement (Meta Feed or Instagram Feed), and an aspectRatio (1:1 or 4:5).`,
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
