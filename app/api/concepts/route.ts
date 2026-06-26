import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionFromCookie, updateSessionStatus } from "@/lib/session";
import { invokeEdgeFunction } from "@/lib/edge-functions";
import { verifyPaidSession } from "@/lib/payment";
import type {
  ConceptsResponse,
  GenerateConceptsResult,
  ProductInput,
  BuyerInsights,
  AngleLabel,
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
      { error: "Payment required to unlock concepts." },
      { status: 402 }
    );
  }

  const supabase = await createClient();

  // If concepts already exist for this session, return them idempotently.
  const { data: existing } = await supabase
    .from("ad_creatives")
    .select("id, angle_id, concept, ad_angles(angle_label)")
    .eq("session_id", session.id);

  if (existing && existing.length > 0) {
    const concepts = (existing as unknown as {
      id: string;
      angle_id: string;
      concept: string;
      ad_angles: { angle_label: AngleLabel } | null;
    }[]).map((c) => ({
      angleId: c.angle_id,
      angleLabel: c.ad_angles?.angle_label ?? ("" as AngleLabel),
      concept: c.concept,
    }));
    const response: ConceptsResponse = {
      status: session.status as "paid" | "generating" | "complete",
      concepts,
    };
    return NextResponse.json(response, { status: 200 });
  }

  // Fetch product context + buyer insights + selected angles from DB.
  const { data: productInputRow } = await supabase
    .from("product_inputs")
    .select()
    .eq("session_id", session.id)
    .maybeSingle();

  if (!productInputRow) {
    return NextResponse.json(
      { error: "No product input found for this session." },
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

  const { data: selectedAnglesRows } = await supabase
    .from("ad_angles")
    .select()
    .eq("session_id", session.id)
    .eq("is_selected", true);

  if (!selectedAnglesRows || selectedAnglesRows.length === 0) {
    return NextResponse.json(
      { error: "No selected angles found. Run angle generation first." },
      { status: 409 }
    );
  }

  const selectedAngles = (selectedAnglesRows as unknown as {
    id: string;
    angle_label: AngleLabel;
    hook: string;
    score: number | null;
  }[]).map((a) => ({
    angleLabel: a.angle_label,
    hook: a.hook,
    score: a.score ?? 0,
    id: a.id,
  }));

  // Invoke the generate-concepts Edge Function (AI-only).
  let result: GenerateConceptsResult;
  try {
    result = await invokeEdgeFunction<GenerateConceptsResult>(
      "generate-concepts",
      {
        productContext: productInput.product_context,
        buyerInsights: {
          buyerProfile: buyerInsights.buyer_profile,
          mainDesire: buyerInsights.main_desire,
          painPoints: buyerInsights.pain_points,
          buyingTriggers: buyerInsights.buying_triggers,
          objections: buyerInsights.objections,
        },
        selectedAngles: selectedAngles.map((a) => ({
          angleLabel: a.angleLabel,
          hook: a.hook,
          score: a.score,
        })),
      }
    );
  } catch (err) {
    console.error("concepts: edge function failed:", err);
    await updateSessionStatus(session.id, "failed").catch(() => {});
    return NextResponse.json(
      { error: "Failed to generate ad concepts. Please try again." },
      { status: 502 }
    );
  }

  // Match concepts to angle IDs by angleLabel.
  const angleMap = new Map(selectedAngles.map((a) => [a.angleLabel, a.id]));

  const rows = result.concepts.map((c) => ({
    session_id: session.id,
    angle_id: angleMap.get(c.angleLabel) ?? selectedAngles[0].id,
    concept: c.concept,
    image_status: "pending" as const,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("ad_creatives")
    .insert(rows)
    .select();

  if (insertError || !inserted) {
    console.error("concepts: insert failed:", insertError?.message);
    await updateSessionStatus(session.id, "failed").catch(() => {});
    return NextResponse.json(
      { error: "Failed to save ad concepts." },
      { status: 500 }
    );
  }

  // Update session status to generating.
  try {
    await updateSessionStatus(session.id, "generating");
  } catch (err) {
    console.error("concepts: status update failed:", err);
  }

  const savedConcepts = (inserted as unknown as {
    id: string;
    angle_id: string;
    concept: string;
  }[]).map((c) => {
    const angle = selectedAngles.find((a) => a.id === c.angle_id);
    return {
      angleId: c.angle_id,
      angleLabel: angle?.angleLabel ?? ("" as AngleLabel),
      concept: c.concept,
    };
  });

  const response: ConceptsResponse = {
    status: "generating",
    concepts: savedConcepts,
  };

  return NextResponse.json(response, { status: 200 });
}
