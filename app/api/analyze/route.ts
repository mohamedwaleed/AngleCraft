import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionFromCookie, updateSessionStatus } from "@/lib/session";
import { invokeEdgeFunction } from "@/lib/edge-functions";
import { getSignedImageUrl, PRODUCT_PHOTOS_BUCKET } from "@/lib/storage";
import type {
  AnalyzeResponse,
  AnalyzeProductResult,
  ProductInput,
} from "@/lib/types";

export async function POST() {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json(
      { error: "Session not found or expired" },
      { status: 404 }
    );
  }

  const supabase = await createClient();

  // Fetch the product input row for this session.
  const { data: productInputRow, error: piError } = await supabase
    .from("product_inputs")
    .select()
    .eq("session_id", session.id)
    .maybeSingle();

  if (piError || !productInputRow) {
    console.error("analyze: product_inputs fetch failed:", piError?.message);
    return NextResponse.json(
      { error: "No product input found for this session." },
      { status: 404 }
    );
  }

  const productInput = productInputRow as ProductInput;

  // Build the product text blob for the Edge Function.
  const textParts: string[] = [];
  if (productInput.extracted_name) textParts.push(`Product: ${productInput.extracted_name}`);
  if (productInput.extracted_description) textParts.push(`Description: ${productInput.extracted_description}`);
  if (productInput.extracted_price) textParts.push(`Price: ${productInput.extracted_price}`);
  if (productInput.extracted_features?.length) textParts.push(`Features: ${productInput.extracted_features.join("; ")}`);
  if (productInput.input_type === "photo") {
    textParts.push("Source: user-uploaded product photo. Analyze the image to identify the product.");
  }
  const productText = textParts.join("\n");

  if (!productText.trim()) {
    return NextResponse.json(
      { error: "Not enough product information to analyze." },
      { status: 422 }
    );
  }

  // Resolve a fresh signed URL for uploaded photos (the one stored at extract
  // time may be close to expiry by the time the user reaches this step).
  let imageUrl: string | null = productInput.extracted_image_url;
  if (productInput.image_storage_path) {
    try {
      imageUrl = await getSignedImageUrl(PRODUCT_PHOTOS_BUCKET, productInput.image_storage_path);
    } catch (err) {
      console.error("analyze: signed URL failed:", err);
    }
  }

  // Mark the session as analyzing before the (slow) AI call.
  try {
    await updateSessionStatus(session.id, "analyzing");
  } catch (err) {
    console.error("analyze: status update to analyzing failed:", err);
  }

  // Invoke the analyze-product Edge Function (AI-only).
  let result: AnalyzeProductResult;
  try {
    result = await invokeEdgeFunction<AnalyzeProductResult>("analyze-product", {
      productText,
      imageUrl,
    });
  } catch (err) {
    console.error("analyze: edge function failed:", err);
    await updateSessionStatus(session.id, "failed").catch(() => {});
    return NextResponse.json(
      { error: "Failed to analyze the product. Please try again." },
      { status: 502 }
    );
  }

  // Persist product_context on the product_inputs row.
  const { error: ctxError } = await supabase
    .from("product_inputs")
    .update({ product_context: result.productContext })
    .eq("session_id", session.id);

  if (ctxError) {
    console.error("analyze: update product_context failed:", ctxError.message);
  }

  // Upsert the buyer_insights row (1:1 with session).
  const { error: biError } = await supabase.from("buyer_insights").upsert(
    {
      session_id: session.id,
      buyer_profile: result.buyerInsights.buyerProfile,
      main_desire: result.buyerInsights.mainDesire,
      pain_points: result.buyerInsights.painPoints,
      buying_triggers: result.buyerInsights.buyingTriggers,
      objections: result.buyerInsights.objections,
    },
    { onConflict: "session_id" }
  );

  if (biError) {
    console.error("analyze: insert buyer_insights failed:", biError.message);
    await updateSessionStatus(session.id, "failed").catch(() => {});
    return NextResponse.json(
      { error: "Failed to save buyer insights." },
      { status: 500 }
    );
  }

  // Advance to generating_angles so the status pipeline triggers /api/angles.
  try {
    await updateSessionStatus(session.id, "generating_angles");
  } catch (err) {
    console.error("analyze: status update to generating_angles failed:", err);
  }

  const response: AnalyzeResponse = {
    status: "generating_angles",
    buyerInsights: result.buyerInsights,
  };

  return NextResponse.json(response, { status: 200 });
}
