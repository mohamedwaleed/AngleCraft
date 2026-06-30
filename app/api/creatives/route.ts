import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionFromCookie, updateSessionStatus } from "@/lib/session";
import { invokeEdgeFunction } from "@/lib/edge-functions";
import { enqueueImageJobs } from "@/lib/queue";
import { verifyPaidSession } from "@/lib/payment";
import { getSignedImageUrl, PRODUCT_PHOTOS_BUCKET } from "@/lib/storage";
import type {
  CreativesResponse,
  GenerateCopyResult,
  ProductInput,
  BuyerInsights,
  AngleLabel,
  ImageStatus,
  AspectRatio,
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
    .select("id, angle_id, creative_index, concept, placement, aspect_ratio, headline, primary_text, cta, image_text, image_status, image_storage_path, ad_angles(angle_label)")
    .eq("session_id", session.id)
    .order("creative_index", { ascending: true });

  if (!existing || existing.length === 0) {
    return NextResponse.json(
      { error: "No concepts found. Run /api/concepts first." },
      { status: 409 }
    );
  }

  const creativeRows = existing as unknown as {
    id: string;
    angle_id: string;
    creative_index: number;
    concept: string;
    placement: string | null;
    aspect_ratio: AspectRatio | null;
    headline: string | null;
    primary_text: string | null;
    cta: string | null;
    image_text: string | null;
    image_status: ImageStatus;
    image_storage_path: string | null;
    ad_angles: { angle_label: AngleLabel } | null;
  }[];

  // Fetch the product input so we can pass the product image to the image
  // generation queue. This is needed in both the idempotent and full paths.
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

  const productImageUrl = await resolveProductImageUrl(productInput);
  if (!productImageUrl) {
    return NextResponse.json(
      { error: "Product image is required to generate creatives." },
      { status: 422 }
    );
  }

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
        prompt: buildImagePrompt(c.concept, c.placement, c.aspect_ratio, c.image_text),
        aspectRatio: c.aspect_ratio ?? "1:1",
        productImageUrl,
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
        creativeIndex: c.creative_index,
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

  // Match copy results to creative rows by creativeIndex (1-based) so each
  // creative gets its own copy even if the AI repeats an angleLabel.
  const copyByIndex = new Map(
    result.creatives.map((c) => [c.creativeIndex, c])
  );

  for (const row of creativeRows) {
    const copy = copyByIndex.get(row.creative_index);
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
    prompt: buildImagePrompt(c.concept, c.placement, c.aspect_ratio, c.image_text),
    aspectRatio: c.aspect_ratio ?? "1:1",
    productImageUrl,
  }));

  await enqueueImageJobs(imageJobs);

  // Update session status to generating.
  try {
    await updateSessionStatus(session.id, "generating");
  } catch (err) {
    console.error("creatives: status update failed:", err);
  }

  const creatives = creativeRows.map((c) => {
    const copy = copyByIndex.get(c.creative_index);
    const label = c.ad_angles?.angle_label;
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
function buildImagePrompt(
  concept: string,
  placement: string | null,
  aspectRatio: AspectRatio | null,
  imageText: string | null
): string {
  const platform = placement?.toLowerCase().includes("instagram")
    ? "Instagram Feed static ad"
    : "Meta Feed static ad";

  const ratioCtx = aspectRatio
    ? `Compose for a ${aspectRatio} aspect ratio.`
    : "";

  const textCtx = imageText
    ? `Use this exact hook text as the main headline, large and readable: "${imageText}".`
    : `Do not add random text. Leave clear empty space at the top for a headline overlay.`;

  return [
    `You are creating a performance marketing ${platform} creative for this ad concept: ${concept}`,
    `⚠️ CRITICAL: The product must be exactly the same as in the provided product reference image.`,
    `Do NOT change, replace, or modify the product in any way.`,
    `Preserve the exact product identity, brand, shape, color, materials, and important details.`,
    `If the product includes multiple items (e.g., phone case + lip tint tube), all items must appear exactly as in the reference.`,
    `The product must be clearly visible and be the hero of the image.`,

    ratioCtx,
    `This must look like a high-converting DTC Meta ad, not just a lifestyle photo.`,
    `Use a clear ad layout: big visual hook area, product as the star, emotional human moment, strong product-benefit connection.`,
    textCtx,
    `Composition rules:
      - Product must be large and immediately recognizable, occupying 20-35% of the image.
      - The viewer should understand what is being sold within 1 second.
      - Use close-up framing, not a wide stock-photo scene.
      - Show the product in use or as the obvious solution to the problem.
      - Add visual emphasis around the product using lighting, depth of field, hand placement, or composition.
      - Keep faces natural and believable.
      - Avoid generic stock-photo aesthetics.
      - Avoid tiny product placement.
      - Avoid abstract backgrounds.
      - Avoid decorative Pinterest-style imagery.
      - Avoid fake UI buttons, logos, watermarks, or unreadable text.`,

    `Output should feel like a polished paid social ad creative a media buyer would confidently launch on Meta Ads today.`,
  ].join(" ");
}

async function resolveProductImageUrl(
  productInput: ProductInput
): Promise<string | null> {
  // Uploaded product photo: generate a fresh signed URL for the private bucket.
  if (productInput.image_storage_path) {
    try {
      return await getSignedImageUrl(PRODUCT_PHOTOS_BUCKET, productInput.image_storage_path);
    } catch (err) {
      console.error("creatives: failed to sign product photo:", err);
      return null;
    }
  }

  // URL input: the extractor should have found a public product image.
  return productInput.extracted_image_url ?? null;
}
