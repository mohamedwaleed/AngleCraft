import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionFromCookie, updateSessionStatus } from "@/lib/session";
import { invokeEdgeFunction } from "@/lib/edge-functions";
import { verifyPaidSession } from "@/lib/payment";
import type {
  TestingPlanResponse,
  TestingPlan,
  TestingPlanContent,
  ProductInput,
  BuyerInsights,
  AdAngle,
  AngleLabel,
} from "@/lib/types";

function parseSellingPrice(
  priceText: string | null | undefined
): number | undefined {
  if (!priceText) return undefined;

  const cleaned = priceText
    .replace(/[£$€¥₹]/g, "")
    .replace(/(?:USD|EUR|GBP|CAD|AUD|INR|JPY)\s*/gi, "")
    .trim();

  const match = cleaned.match(/(\d{1,3}(?:[.,]\d{3})*|\d+)([.,]\d{2})?/);
  if (!match) return undefined;

  let numeric = match[0];

  if (numeric.includes(",") && numeric.includes(".")) {
    const lastComma = numeric.lastIndexOf(",");
    const lastDot = numeric.lastIndexOf(".");
    if (lastComma > lastDot) {
      numeric = numeric.replace(/\./g, "").replace(",", ".");
    } else {
      numeric = numeric.replace(/,/g, "");
    }
  } else if (numeric.includes(",")) {
    if (/,\d{2}$/.test(numeric)) {
      numeric = numeric.replace(",", ".");
    } else {
      numeric = numeric.replace(/,/g, "");
    }
  }

  const value = parseFloat(numeric);
  return isNaN(value) || value <= 0 ? undefined : value;
}

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
      { error: "Payment required to generate testing plan." },
      { status: 402 }
    );
  }

  const supabase = await createClient();

  // If a testing plan already exists for this session, return it idempotently.
  // If it was generated with the old schema (missing campaignStrategy/testingPlan),
  // delete it and regenerate so the report uses the new unified strategy shape.
  const { data: existingPlan } = await supabase
    .from("testing_plans")
    .select()
    .eq("session_id", session.id)
    .maybeSingle();

  if (existingPlan) {
    const plan = existingPlan as TestingPlan;
    const content = plan.plan_content as unknown as Record<string, unknown>;
    const actionPlan = content?.actionPlan as Record<string, unknown> | undefined;
    const hasNewShape =
      content &&
      typeof content.campaignStrategy === "object" &&
      typeof content.testingPlan === "object" &&
      content.campaignStrategy !== null &&
      content.testingPlan !== null &&
      Array.isArray(content.whyWinner) &&
      actionPlan &&
      typeof actionPlan.campaignType === "string" &&
      typeof actionPlan.audienceStrategy === "string" &&
      typeof actionPlan.optimizationGoal === "string" &&
      content.successCriteria &&
      typeof content.successCriteria === "object" &&
      content.targetCpa &&
      typeof content.targetCpa === "object";
    if (hasNewShape) {
      const response: TestingPlanResponse = {
        status: "complete",
        testingPlan: content as unknown as TestingPlanContent,
      };
      return NextResponse.json(response, { status: 200 });
    }
    await supabase.from("testing_plans").delete().eq("session_id", session.id);
  }

  // Fetch product context.
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

  // Fetch buyer insights.
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

  // Fetch all 5 angles (with selected flags).
  const { data: anglesRows } = await supabase
    .from("ad_angles")
    .select()
    .eq("session_id", session.id);

  if (!anglesRows || anglesRows.length === 0) {
    return NextResponse.json(
      { error: "No ad angles found. Run angle generation first." },
      { status: 409 }
    );
  }

  const angles = (anglesRows as AdAngle[]).map((a) => ({
    angleLabel: a.angle_label,
    hook: a.hook,
    rationale: a.rationale ?? "",
    score: a.score ?? 0,
    isSelected: a.is_selected,
  }));

  // Fetch the 3 creatives (with copy and concepts).
  const { data: creativesRows } = await supabase
    .from("ad_creatives")
    .select("id, angle_id, creative_index, concept, headline, primary_text, cta, ad_angles(angle_label)")
    .eq("session_id", session.id)
    .order("creative_index", { ascending: true });

  if (!creativesRows || creativesRows.length === 0) {
    return NextResponse.json(
      { error: "No ad creatives found. Run creative generation first." },
      { status: 409 }
    );
  }

  const rawCreatives = creativesRows as unknown as {
    id: string;
    angle_id: string;
    creative_index: number;
    concept: string;
    headline: string | null;
    primary_text: string | null;
    cta: string | null;
    ad_angles: { angle_label: AngleLabel } | null;
  }[];

  const creatives = rawCreatives.map((c) => ({
    index: c.creative_index,
    angleLabel: c.ad_angles?.angle_label ?? ("" as AngleLabel),
    headline: c.headline ?? "",
    primaryText: c.primary_text ?? "",
    cta: c.cta ?? "",
    concept: c.concept,
  }));

  // Invoke the generate-testing-plan Edge Function (AI-only).
  let result: { testingPlan: TestingPlan["plan_content"] };
  try {
    result = await invokeEdgeFunction<{ testingPlan: TestingPlan["plan_content"] }>(
      "generate-testing-plan",
      {
        productContext: productInput.product_context,
        sellingPrice: parseSellingPrice(productInput.extracted_price),
        buyerInsights: {
          buyerProfile: buyerInsights.buyer_profile,
          mainDesire: buyerInsights.main_desire,
          painPoints: buyerInsights.pain_points,
          buyingTriggers: buyerInsights.buying_triggers,
          objections: buyerInsights.objections,
        },
        angles,
        creatives,
      }
    );
  } catch (err) {
    console.error("testing-plan: edge function failed:", err);
    await updateSessionStatus(session.id, "failed").catch(() => {});
    return NextResponse.json(
      { error: "Failed to generate testing plan. Please try again." },
      { status: 502 }
    );
  }

  // Insert the testing plan row.
  const { error: insertError } = await supabase
    .from("testing_plans")
    .insert({
      session_id: session.id,
      plan_content: result.testingPlan,
    });

  if (insertError) {
    console.error("testing-plan: insert failed:", insertError.message);
    await updateSessionStatus(session.id, "failed").catch(() => {});
    return NextResponse.json(
      { error: "Failed to save testing plan." },
      { status: 500 }
    );
  }

  // Mark session as complete.
  try {
    await updateSessionStatus(session.id, "complete");
  } catch (err) {
    console.error("testing-plan: status update failed:", err);
  }

  const response: TestingPlanResponse = {
    status: "complete",
    testingPlan: result.testingPlan,
  };

  return NextResponse.json(response, { status: 200 });
}
