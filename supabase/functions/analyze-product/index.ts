// Edge Function: analyze-product
// AI-only: receives product text + optional image URL, calls OpenAI with
// ProductContextSchema then BuyerInsightsSchema, and returns both results.
// No DB writes, no Storage access.

import { generateStructured } from "../_shared/openai-client.ts";
import {
  ProductContextSchema,
  BuyerInsightsSchema,
  type ProductContext,
  type BuyerInsights,
} from "../_shared/schemas.ts";

interface AnalyzeRequest {
  productText: string;
  imageUrl?: string | null;
}

interface AnalyzeResponse {
  productContext: ProductContext;
  buyerInsights: BuyerInsights;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: AnalyzeRequest;
  try {
    body = await req.json() as AnalyzeRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.productText || body.productText.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: "productText is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Step 1: Product context analysis (text + optional image via vision).
    // If the image URL fails (tracking pixel, expired link, etc.), fall back
    // to text-only analysis instead of failing the whole request.
    const userMessage = body.imageUrl
      ? [
          {
            type: "text",
            text: `Analyze this product and extract structured context.\n\nProduct information:\n${body.productText}`,
          },
          {
            type: "image_url",
            image_url: { url: body.imageUrl },
          },
        ]
      : `Analyze this product and extract structured context.\n\nProduct information:\n${body.productText}`;

    let productContext: ProductContext;
    try {
      productContext = await generateStructured(ProductContextSchema, [
        {
          role: "system",
          content:
            "You are a product analysis expert. Given product information, extract structured product context for ad creative generation. Be concise and specific. Infer a reasonable category and price range from the available signals.",
        },
        { role: "user", content: userMessage },
      ]);
    } catch (imgErr) {
      // Image download failed — retry with text only.
      console.warn("analyze-product: image failed, falling back to text-only:", imgErr instanceof Error ? imgErr.message : String(imgErr));
      productContext = await generateStructured(ProductContextSchema, [
        {
          role: "system",
          content:
            "You are a product analysis expert. Given product information, extract structured product context for ad creative generation. Be concise and specific. Infer a reasonable category and price range from the available signals.",
        },
        {
          role: "user",
          content: `Analyze this product and extract structured context.\n\nProduct information:\n${body.productText}`,
        },
      ]);
    }

    // Step 2: Buyer Insights from product context.
    const buyerInsights = await generateStructured(BuyerInsightsSchema, [
      {
        role: "system",
        content:
          "You are a consumer psychology expert. Given a product, analyze the target buyer's psychology: who they are, what they want, what pains them, what triggers purchases, and what objections they have. Be specific to this product.",
      },
      {
        role: "user",
        content: `Product context:\n${JSON.stringify(productContext, null, 2)}\n\nProduct information:\n${body.productText}`,
      },
    ]);

    const result: AnalyzeResponse = { productContext, buyerInsights };
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("analyze-product error:", message);
    return new Response(
      JSON.stringify({ error: "Failed to analyze product", detail: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
