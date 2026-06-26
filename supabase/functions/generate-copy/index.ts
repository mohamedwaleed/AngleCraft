// Edge Function: generate-copy
// AI-only: receives product context + buyer insights + 3 concepts, calls
// OpenAI with AdCopySchema, returns 3 creatives with headline/primaryText/cta
// — no DB writes.

import { generateStructured } from "../_shared/openai-client.ts";
import { AdCopySchema, type AdCopy } from "../_shared/schemas.ts";

interface GenerateCopyRequest {
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
  concepts: {
    angleLabel: string;
    concept: string;
  }[];
}

interface GenerateCopyResponse {
  creatives: AdCopy["creatives"];
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: GenerateCopyRequest;
  try {
    body = await req.json() as GenerateCopyRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.productContext || !body.buyerInsights || !body.concepts || body.concepts.length === 0) {
    return new Response(
      JSON.stringify({ error: "productContext, buyerInsights, and concepts are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const result = await generateStructured(AdCopySchema, [
      {
        role: "system",
        content:
          "You are an expert direct-response copywriter for social media ads (Meta and TikTok). Given a product, buyer insights, and three creative concepts, write ad copy for each concept. For each creative, provide: a headline (max 40 chars — punchy, attention-grabbing), primary text (max 200 chars — persuasive body copy), and a CTA (max 20 chars — action-oriented). Write for the target audience described in the buyer insights. Make each creative feel distinct.",
      },
      {
        role: "user",
        content:
          `Product context:\n${JSON.stringify(body.productContext, null, 2)}\n\nBuyer insights:\n${JSON.stringify(body.buyerInsights, null, 2)}\n\nConcepts:\n${JSON.stringify(body.concepts, null, 2)}\n\nWrite exactly three sets of ad copy — one for each concept. Each must include the angleLabel matching the input concept.`,
      },
    ]);

    const response: GenerateCopyResponse = { creatives: result.creatives };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("generate-copy error:", message);
    return new Response(
      JSON.stringify({ error: "Failed to generate ad copy", detail: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
