import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionFromCookie, updateSessionStatus } from "@/lib/session";
import { invokeEdgeFunction } from "@/lib/edge-functions";
import type {
  AnglesResponse,
  GenerateAnglesResult,
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

  const supabase = await createClient();

  // If angles already exist for this session, return them idempotently.
  const { data: existing } = await supabase
    .from("ad_angles")
    .select()
    .eq("session_id", session.id);

  if (existing && existing.length > 0) {
    const angles = (existing as unknown as {
      id: string;
      angle_label: AngleLabel;
      hook: string;
      rationale: string | null;
      score: number | null;
      is_selected: boolean;
    }[]).map((a) => ({
      id: a.id,
      angleLabel: a.angle_label,
      hook: a.hook,
      rationale: a.rationale ?? "",
      score: a.score ?? 0,
      isSelected: a.is_selected,
    }));
    const response: AnglesResponse = {
      status: "angles_generated",
      angles,
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
      { error: "No product input found for this session." },
      { status: 404 }
    );
  }

  const productInput = productInputRow as ProductInput;
  if (!productInput.product_context) {
    return NextResponse.json(
      { error: "Product context not yet generated. Run /api/analyze first." },
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
      { error: "Buyer insights not yet generated. Run /api/analyze first." },
      { status: 409 }
    );
  }

  const buyerInsights = buyerInsightsRow as BuyerInsights;

  // Invoke the generate-angles Edge Function (AI-only).
  let result: GenerateAnglesResult;
  try {
    result = await invokeEdgeFunction<GenerateAnglesResult>("generate-angles", {
      productContext: productInput.product_context,
      buyerInsights: {
        buyerProfile: buyerInsights.buyer_profile,
        mainDesire: buyerInsights.main_desire,
        painPoints: buyerInsights.pain_points,
        buyingTriggers: buyerInsights.buying_triggers,
        objections: buyerInsights.objections,
      },
    });
  } catch (err) {
    console.error("angles: edge function failed:", err);
    await updateSessionStatus(session.id, "failed").catch(() => {});
    return NextResponse.json(
      { error: "Failed to generate ad angles. Please try again." },
      { status: 502 }
    );
  }

  // Select top 3 by score (application logic, not AI).
  const sorted = [...result.angles].sort((a, b) => b.score - a.score);
  const selectedLabels = new Set(sorted.slice(0, 3).map((a) => a.angleLabel));

  // Insert 5 ad_angles rows.
  const rows = result.angles.map((a) => ({
    session_id: session.id,
    angle_label: a.angleLabel,
    hook: a.hook,
    rationale: a.rationale,
    score: a.score,
    is_selected: selectedLabels.has(a.angleLabel),
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("ad_angles")
    .insert(rows)
    .select();

  if (insertError || !inserted) {
    console.error("angles: insert failed:", insertError?.message);
    await updateSessionStatus(session.id, "failed").catch(() => {});
    return NextResponse.json(
      { error: "Failed to save ad angles." },
      { status: 500 }
    );
  }

  // Ensure session status is angles_generated.
  try {
    await updateSessionStatus(session.id, "angles_generated");
  } catch (err) {
    console.error("angles: status update failed:", err);
  }

  const savedAngles = (inserted as unknown as {
    id: string;
    angle_label: AngleLabel;
    hook: string;
    rationale: string | null;
    score: number | null;
    is_selected: boolean;
  }[]).map((a) => ({
    id: a.id,
    angleLabel: a.angle_label,
    hook: a.hook,
    rationale: a.rationale ?? "",
    score: a.score ?? 0,
    isSelected: a.is_selected,
  }));

  const response: AnglesResponse = {
    status: "angles_generated",
    angles: savedAngles,
  };

  return NextResponse.json(response, { status: 200 });
}
