import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionFromCookie, updateSessionStatus } from "@/lib/session";
import { invokeEdgeFunction } from "@/lib/edge-functions";
import { enqueueImageJobs } from "@/lib/queue";
import { verifyPaidSession } from "@/lib/payment";
import type {
  CreativesResponse,
  GenerateCopyResult,
  ProductInput,
  BuyerInsights,
  AngleLabel,
  ImageStatus,
} from "@/lib/types";

export async function POST() {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json(
      { error: "Session not found or expired" },
      { status: 404 }
    );
  }

  // Verify paid session (checks session status, falls back to payments table
  // to handle webhook race conditions).
  const isPaid = await verifyPaidSession(session);
  if (!isPaid) {
    return NextResponse.json(
      { error: "Payment required to unlock creatives." },
      { status: 402 }
    );
  }

  const supabase = await createClient();

  // Fetch existing creatives to check if copy has already been generated.
  const { data: existing } = await supabase
    .from("ad_creatives")
    .select("id, angle_id, concept, headline, primary_text, cta, image_status, image_storage_path, ad_angles(angle_label)")
    .eq("session_id", session.id);

  if (!existing || existing.length === 0) {
    return NextResponse.json(
      { error: "No concepts found. Run /api/concepts first." },
      { status: 409 }
    );
  }

  const creativeRows = existing as unknown as {
    id: string;
    angle_id: string;
    concept: string;
    headline: string | null;
    primary_text: string | null;
    cta: string | null;
    image_status: ImageStatus;
    image_storage_path: string | null;
    ad_angles: { angle_label: AngleLabel } | null;
  }[];

  // If all creatives already have copy, return them idempotently (still
  // enqueue image jobs for any creatives that don't have a complete image).
  const allHaveCopy = creativeRows.every((c) => c.headline !== null);
  if (allHaveCopy) {
    // Enqueue image jobs for any creatives without a completed image.
    // Includes "pending", "processing" (previous attempt may have failed),
    // and "failed" statuses.
    const pendingJobs = creativeRows
      .filter((c) => c.image_status !== "complete")
      .map((c) => ({
        sessionId: session.id,
        creativeId: c.id,
        concept: c.concept,
        prompt: `Professional product ad image for: ${c.concept}. Clean, modern, high-converting social media ad creative.`,
      }));

    if (pendingJobs.length > 0) {
      // Reset image_status to pending for any that were processing/failed.
      const staleIds = creativeRows
        .filter((c) => c.image_status === "processing" || c.image_status === "failed")
        .map((c) => c.id);
      if (staleIds.length > 0) {
        await supabase
          .from("ad_creatives")
          .update({ image_status: "pending" })
          .in("id", staleIds);
      }
      await enqueueImageJobs(pendingJobs);
    }

    const creatives = creativeRows.map((c) => ({
      id: c.id,
      angleLabel: c.ad_angles?.angle_label ?? ("" as AngleLabel),
      headline: c.headline ?? "",
      primaryText: c.primary_text ?? "",
      cta: c.cta ?? "",
      imageStatus: c.image_status,
    }));

    const response: CreativesResponse = {
      status: session.status as "paid" | "generating" | "complete",
      creatives,
    };
    return NextResponse.json(response, { status: 200 });
  }

  // Fetch product context + buyer insights from DB.
  const { data: productInputRow } = await supabase
    .from("product_inputs")
    .select()
    .eq("session_id", session.id)
    .maybeSingle();

  if (!productInputRow) {
    return NextResponse.json(
      { error: "No product input found." },
      { status: 404 }
    );
  }

  const productInput = productInputRow as ProductInput;
  if (!productInput.product_context) {
    return NextResponse.json(
      { error: "Product context not yet generated." },
      { status: 409 }
    );
  }

  const { data: buyerInsightsRow } = await supabase
    .from("buyer_insights")
    .select()
    .eq("session_id", session.id)
    .maybeSingle();

  if (!buyerInsightsRow) {
    return NextResponse.json(
      { error: "Buyer insights not yet generated." },
      { status: 409 }
    );
  }

  const buyerInsights = buyerInsightsRow as BuyerInsights;

  // Invoke the generate-copy Edge Function (AI-only).
  let result: GenerateCopyResult;
  try {
    result = await invokeEdgeFunction<GenerateCopyResult>("generate-copy", {
      productContext: productInput.product_context,
      buyerInsights: {
        buyerProfile: buyerInsights.buyer_profile,
        mainDesire: buyerInsights.main_desire,
        painPoints: buyerInsights.pain_points,
        buyingTriggers: buyerInsights.buying_triggers,
        objections: buyerInsights.objections,
      },
      concepts: creativeRows.map((c) => ({
        angleLabel: c.ad_angles?.angle_label ?? "",
        concept: c.concept,
      })),
    });
  } catch (err) {
    console.error("creatives: edge function failed:", err);
    await updateSessionStatus(session.id, "failed").catch(() => {});
    return NextResponse.json(
      { error: "Failed to generate ad copy. Please try again." },
      { status: 502 }
    );
  }

  // Match copy results to creative rows by angleLabel and update them.
  const copyMap = new Map(
    result.creatives.map((c) => [c.angleLabel, c])
  );

  for (const row of creativeRows) {
    const angleLabel = row.ad_angles?.angle_label;
    const copy = angleLabel ? copyMap.get(angleLabel) : undefined;
    if (copy) {
      const { error: updateError } = await supabase
        .from("ad_creatives")
        .update({
          headline: copy.headline,
          primary_text: copy.primaryText,
          cta: copy.cta,
        })
        .eq("id", row.id);

      if (updateError) {
        console.error("creatives: update failed for", row.id, updateError.message);
      }
    }
  }

  // Enqueue image generation jobs for all creatives.
  const imageJobs = creativeRows.map((c) => ({
    sessionId: session.id,
    creativeId: c.id,
    concept: c.concept,
    prompt: `Professional product ad image for: ${c.concept}. Clean, modern, high-converting social media ad creative.`,
  }));

  await enqueueImageJobs(imageJobs);

  // Update session status to generating.
  try {
    await updateSessionStatus(session.id, "generating");
  } catch (err) {
    console.error("creatives: status update failed:", err);
  }

  const creatives = creativeRows.map((c) => {
    const label = c.ad_angles?.angle_label;
    const copy = label ? copyMap.get(label) : undefined;
    return {
      id: c.id,
      angleLabel: label ?? ("" as AngleLabel),
      headline: copy?.headline ?? c.headline ?? "",
      primaryText: copy?.primaryText ?? c.primary_text ?? "",
      cta: copy?.cta ?? c.cta ?? "",
      imageStatus: "pending" as ImageStatus,
    };
  });

  const response: CreativesResponse = {
    status: "generating",
    creatives,
  };

  return NextResponse.json(response, { status: 200 });
}
