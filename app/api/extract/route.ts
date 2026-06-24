import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createSession,
  setSessionCookie,
  updateSessionStatus,
} from "@/lib/session";
import { extractProductFromUrl, ExtractionError } from "@/lib/extraction";
import { uploadProductPhoto, getSignedImageUrl, PRODUCT_PHOTOS_BUCKET } from "@/lib/storage";
import type { ExtractResponse, InputType } from "@/lib/types";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_PHOTO_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 }
    );
  }

  const url = (formData.get("url") as string | null)?.trim() || null;
  const photo = formData.get("photo") as File | null;

  if (!url && !photo) {
    return NextResponse.json(
      { error: "Provide a product URL or upload a photo." },
      { status: 400 }
    );
  }
  if (url && photo) {
    return NextResponse.json(
      { error: "Provide either a URL or a photo, not both." },
      { status: 400 }
    );
  }

  const inputType: InputType = url ? "url" : "photo";

  // Validate photo before creating a session.
  if (photo) {
    if (photo.size === 0) {
      return NextResponse.json(
        { error: "The uploaded photo is empty." },
        { status: 400 }
      );
    }
    if (photo.size > MAX_PHOTO_BYTES) {
      return NextResponse.json(
        { error: "Photo must be 10 MB or smaller." },
        { status: 400 }
      );
    }
    if (photo.type && !ALLOWED_PHOTO_TYPES.includes(photo.type.toLowerCase())) {
      return NextResponse.json(
        { error: "Photo must be PNG, JPG, or WEBP." },
        { status: 400 }
      );
    }
  }

  // Create the anonymous session and set the cookie.
  let session;
  try {
    session = await createSession();
  } catch (err) {
    console.error("extract: createSession failed:", err);
    return NextResponse.json(
      { error: "Failed to start a session. Please try again." },
      { status: 500 }
    );
  }

  await setSessionCookie(session.token);

  const supabase = await createClient();

  // Build the product_inputs row from the chosen input.
  let extractedName: string | null = null;
  let extractedDescription: string | null = null;
  let extractedPrice: string | null = null;
  let extractedFeatures: string[] | null = null;
  let extractedImageUrl: string | null = null;
  let imageStoragePath: string | null = null;

  if (inputType === "url") {
    try {
      const extracted = await extractProductFromUrl(url as string);
      extractedName = extracted.name;
      extractedDescription = extracted.description;
      extractedPrice = extracted.price;
      extractedFeatures = extracted.features;
      extractedImageUrl = extracted.imageUrl;
    } catch (err) {
      if (err instanceof ExtractionError) {
        return NextResponse.json(
          { error: err.message },
          { status: err.status === 400 ? 400 : 422 }
        );
      }
      console.error("extract: extraction failed:", err);
      return NextResponse.json(
        { error: "Could not extract product info. Try uploading a photo instead." },
        { status: 422 }
      );
    }
  } else {
    // Photo upload — store it and build a minimal text blob for the AI step.
    try {
      imageStoragePath = await uploadProductPhoto(session.id, photo as File);
    } catch (err) {
      console.error("extract: photo upload failed:", err);
      return NextResponse.json(
        { error: "Failed to upload the photo. Please try again." },
        { status: 500 }
      );
    }

    // Generate a signed URL so the analyze-product Edge Function can see the image.
    try {
      extractedImageUrl = await getSignedImageUrl(PRODUCT_PHOTOS_BUCKET, imageStoragePath);
    } catch (err) {
      console.error("extract: signed URL failed:", err);
    }

    extractedName = (photo as File).name.replace(/\.[^.]+$/, "");
  }

  // Insert the product_inputs row.
  const { error: insertError } = await supabase.from("product_inputs").insert({
    session_id: session.id,
    input_type: inputType,
    url: inputType === "url" ? url : null,
    image_storage_path: imageStoragePath,
    extracted_name: extractedName,
    extracted_description: extractedDescription,
    extracted_price: extractedPrice,
    extracted_features: extractedFeatures,
    extracted_image_url: extractedImageUrl,
  });

  if (insertError) {
    console.error("extract: insert product_inputs failed:", insertError.message);
    return NextResponse.json(
      { error: "Failed to save product info. Please try again." },
      { status: 500 }
    );
  }

  // Extraction is already complete (it ran synchronously above). Advance the
  // session status to `analyzing` so the status pipeline triggers /api/analyze
  // as the next step. The `extracting` status is not used because cheerio
  // extraction finishes within the route handler — by the time the user lands
  // on /status, extraction is done.
  try {
    await updateSessionStatus(session.id, "analyzing");
  } catch (err) {
    console.error("extract: status update failed:", err);
  }

  const response: ExtractResponse = {
    sessionId: session.id,
    status: "extracting",
    product: {
      name: extractedName,
      description: extractedDescription,
      price: extractedPrice,
      features: extractedFeatures,
      imageUrl: extractedImageUrl,
    },
  };

  return NextResponse.json(response, { status: 200 });
}
