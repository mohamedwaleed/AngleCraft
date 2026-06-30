import { NextResponse } from "next/server";
import JSZip from "jszip";
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
  ImageStatus,
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
      { error: "Payment required to download campaign package." },
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
    .select("id, angle_id, creative_index, concept, headline, primary_text, cta, image_status, image_storage_path, ad_angles(angle_label, score, rationale)")
    .eq("session_id", session.id)
    .order("creative_index", { ascending: true });

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
    rationale: string | null;
    score: number | null;
    is_selected: boolean;
  }[]).map((a) => ({
    angleLabel: a.angle_label,
    hook: a.hook,
    rationale: a.rationale ?? "",
    score: a.score ?? 0,
    isSelected: a.is_selected,
  }));

  // Generate signed URLs for creative images and prepare the download list.
  const creativeRows = creativesRows as unknown as {
    id: string;
    creative_index: number;
    angle_id: string;
    concept: string;
    headline: string | null;
    primary_text: string | null;
    cta: string | null;
    image_status: ImageStatus;
    image_storage_path: string | null;
    ad_angles: { angle_label: AngleLabel; score: number | null; rationale: string | null } | null;
  }[];

  const creativesWithImages = await Promise.all(
    creativeRows.map(async (c) => {
      let imageUrl: string | null = null;
      if (c.image_storage_path && c.image_status === "complete") {
        try {
          imageUrl = await getSignedImageUrl("ad-creatives", c.image_storage_path);
        } catch (err) {
          console.error("download: signed URL failed:", err);
        }
      }
      return {
        creativeIndex: c.creative_index,
        angleLabel: c.ad_angles?.angle_label ?? ("" as AngleLabel),
        headline: c.headline ?? "",
        primaryText: c.primary_text ?? "",
        cta: c.cta ?? "",
        score: c.ad_angles?.score ?? 0,
        rationale: c.ad_angles?.rationale ?? "",
        imageUrl,
        imageStatus: c.image_status,
        imageStoragePath: c.image_storage_path,
      };
    })
  );

  // Ensure all selected creatives have finished generating before packaging.
  const incompleteCreatives = creativesWithImages.filter(
    (c) => !c.imageUrl || c.imageStatus !== "complete"
  );
  if (incompleteCreatives.length > 0) {
    return NextResponse.json(
      {
        error:
          "All creative images must finish generating before downloading the campaign package.",
      },
      { status: 409 }
    );
  }

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

  // Build the campaign ZIP: PDF report + each creative image.
  const zip = new JSZip();
  zip.file("anglecraft-campaign-report.pdf", pdfBuffer);

  try {
    await Promise.all(
      creativesWithImages.map(async (c) => {
        if (!c.imageUrl || !c.imageStoragePath) return;
        const response = await fetch(c.imageUrl);
        if (!response.ok) {
          throw new Error(
            `Failed to download creative ${c.creativeIndex} image (${response.status})`
          );
        }
        const arrayBuffer = await response.arrayBuffer();
        const ext = c.imageStoragePath.split(".").pop() || "png";
        zip.file(`creative-${c.creativeIndex}.${ext}`, new Uint8Array(arrayBuffer));
      })
    );
  } catch (err) {
    console.error("download: failed to package creative images:", err);
    return NextResponse.json(
      { error: "Failed to package creative images." },
      { status: 500 }
    );
  }

  let zipBuffer: Buffer;
  try {
    zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  } catch (err) {
    console.error("download: ZIP generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate campaign ZIP." },
      { status: 500 }
    );
  }

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": "attachment; filename=anglecraft-campaign.zip",
    },
  });
}
