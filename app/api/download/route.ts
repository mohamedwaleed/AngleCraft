import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/session";
import { getSignedImageUrl } from "@/lib/storage";
import { generateCampaignPdf } from "@/lib/pdf";
import { verifyPaidSession } from "@/lib/payment";
import type {
  ProductInput,
  BuyerInsights,
  TestingPlan,
  AngleLabel,
} from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
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
      { error: "Payment required to download campaign PDF." },
      { status: 402 }
    );
  }

  const supabase = await createClient();

  // Fetch all artifacts from DB.
  const { data: productInputRow } = await supabase
    .from("product_inputs")
    .select()
    .eq("session_id", session.id)
    .maybeSingle();

  const { data: buyerInsightsRow } = await supabase
    .from("buyer_insights")
    .select()
    .eq("session_id", session.id)
    .maybeSingle();

  const { data: anglesRows } = await supabase
    .from("ad_angles")
    .select()
    .eq("session_id", session.id);

  const { data: creativesRows } = await supabase
    .from("ad_creatives")
    .select("id, angle_id, concept, headline, primary_text, cta, image_status, image_storage_path, ad_angles(angle_label)")
    .eq("session_id", session.id);

  const { data: testingPlanRow } = await supabase
    .from("testing_plans")
    .select()
    .eq("session_id", session.id)
    .maybeSingle();

  if (!buyerInsightsRow || !anglesRows || !creativesRows) {
    return NextResponse.json(
      { error: "Campaign data is not complete yet." },
      { status: 409 }
    );
  }

  const productName =
    (productInputRow as ProductInput | null)?.extracted_name ??
    (productInputRow as ProductInput | null)?.product_context?.name ??
    "Your Product";

  const buyerInsights = buyerInsightsRow as BuyerInsights;

  const angles = (anglesRows as unknown as {
    angle_label: AngleLabel;
    hook: string;
    score: number | null;
    is_selected: boolean;
  }[]).map((a) => ({
    angleLabel: a.angle_label,
    hook: a.hook,
    score: a.score ?? 0,
    isSelected: a.is_selected,
  }));

  // Generate signed URLs for creative images.
  const creativeRows = creativesRows as unknown as {
    angle_id: string;
    concept: string;
    headline: string | null;
    primary_text: string | null;
    cta: string | null;
    image_status: string;
    image_storage_path: string | null;
    ad_angles: { angle_label: AngleLabel } | null;
  }[];

  const creativesWithImages = await Promise.all(
    creativeRows.map(async (c) => {
      let imageUrl: string | null = null;
      if (c.image_storage_path) {
        try {
          imageUrl = await getSignedImageUrl("ad-creatives", c.image_storage_path);
        } catch (err) {
          console.error("download: signed URL failed:", err);
        }
      }
      return {
        angleLabel: c.ad_angles?.angle_label ?? ("" as AngleLabel),
        headline: c.headline ?? "",
        primaryText: c.primary_text ?? "",
        cta: c.cta ?? "",
        imageUrl,
      };
    })
  );

  const testingPlan = testingPlanRow
    ? (testingPlanRow as TestingPlan).plan_content
    : null;

  // Generate PDF.
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateCampaignPdf({
      productName,
      buyerProfile: buyerInsights.buyer_profile,
      mainDesire: buyerInsights.main_desire,
      painPoints: buyerInsights.pain_points,
      buyingTriggers: buyerInsights.buying_triggers,
      objections: buyerInsights.objections,
      angles,
      creatives: creativesWithImages,
      testingPlan,
    });
  } catch (err) {
    console.error("download: PDF generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF." },
      { status: 500 }
    );
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=anglecraft-campaign.pdf",
    },
  });
}
