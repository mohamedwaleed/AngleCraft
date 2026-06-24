// Supabase Storage helpers.
// Both buckets (`product-photos`, `ad-creatives`) are private — images are
// served via signed URLs generated server-side with the service-role client.
// The database stores storage paths, never base64 blobs.

import { createClient } from "@supabase/supabase-js";

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export const PRODUCT_PHOTOS_BUCKET = "product-photos";
export const AD_CREATIVES_BUCKET = "ad-creatives";
export const SIGNED_URL_TTL_SECONDS = 3600; // 1 hour

function getServiceClient() {
  if (!SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  if (!SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Upload a product photo to the private `product-photos` bucket.
 * Returns the storage path (`{sessionId}/{timestamp}-{filename}`).
 */
export async function uploadProductPhoto(
  sessionId: string,
  file: File
): Promise<string> {
  const supabase = getServiceClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const safeExt = ["png", "jpg", "jpeg", "webp"].includes(ext) ? ext : "png";
  const path = `${sessionId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${safeExt}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from(PRODUCT_PHOTOS_BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type || "image/png",
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload product photo: ${error.message}`);
  }

  return path;
}

/**
 * Generate a 1-hour signed URL for an object in a private bucket.
 * Returns null if the path is empty.
 */
export async function getSignedImageUrl(
  bucket: string,
  path: string
): Promise<string | null> {
  if (!path) return null;
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? "unknown"}`);
  }

  return data.signedUrl;
}
