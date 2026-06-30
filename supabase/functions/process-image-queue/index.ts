// @ts-nocheck
// Edge Function: process-image-queue
// Cron-triggered, self-contained queue consumer for image generation jobs.
// Reads up to 3 messages from the `image_generation` pgmq queue, calls
// OpenAI gpt-image-2 (or gpt-image-1) for each, uploads the result to Supabase Storage
// (`ad-creatives` bucket), and updates the `ad_creatives` row.
//
// This is the only Edge Function that writes to the database and Storage
// because it is triggered by pg_cron (not by an HTTP request from Next.js).

import { getSupabaseClient } from "../_shared/supabase-client.ts";

const QUEUE_NAME = "image_generation";
const BUCKET_NAME = "ad-creatives";
const VISIBILITY_TIMEOUT_SECONDS = 120;
const MAX_RETRIES = 3;
const BATCH_SIZE = 3;

interface ImageJobMessage {
  sessionId: string;
  creativeId: string;
  concept: string;
  prompt: string;
  aspectRatio?: string;
  productImageUrl: string;
}

interface QueueMessage {
  msg_id: number;
  read_ct: number;
  message: ImageJobMessage;
}

async function generateImageWithReference(
  openAiKey: string,
  model: string,
  size: string,
  prompt: string,
  referenceImageUrl: string
): Promise<Response> {
  const refFetch = await fetch(referenceImageUrl);
  if (!refFetch.ok) {
    throw new Error(`Failed to download reference image (${refFetch.status}): ${referenceImageUrl}`);
  }
  const refBytes = new Uint8Array(await refFetch.arrayBuffer());
  const contentType = refFetch.headers.get("content-type") || "image/png";

  const form = new FormData();
  form.append("model", model);
  form.append("prompt", prompt);
  form.append("n", "1");
  form.append("size", size);
  form.append("image", new Blob([refBytes], { type: contentType }), "reference.png");

  return fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}` },
    body: form,
  });
}

Deno.serve(async (_req: Request) => {
  const supabase = getSupabaseClient();

  try {
    // Read up to BATCH_SIZE messages from the queue.
    // pgmq_public.read(queue_name, sleep_seconds, n)
    const { data: messages, error: readError } = await supabase
      .schema("pgmq_public")
      .rpc("read", {
        queue_name: QUEUE_NAME,
        sleep_seconds: VISIBILITY_TIMEOUT_SECONDS,
        n: BATCH_SIZE,
      });

    if (readError) {
      console.error("process-image-queue: read error:", readError.message);
      return new Response(
        JSON.stringify({ error: "Failed to read queue", detail: readError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No messages in queue" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const results: { msg_id: number; success: boolean; storagePath?: string; error?: string }[] = [];

    for (const msg of messages as QueueMessage[]) {
      const job = msg.message;
      const retryCount = (msg.read_ct ?? 0);

      try {
        // Update image_status to 'processing'.
        await supabase
          .from("ad_creatives")
          .update({ image_status: "processing" })
          .eq("id", job.creativeId);

        // Generate image with OpenAI.
        const openAiKey = Deno.env.get("OPENAI_API_KEY");
        if (!openAiKey) {
          throw new Error("OPENAI_API_KEY is not set");
        }

        // Map aspect ratio to a supported OpenAI image size.
        // gpt-image-1 supports: 1024x1024, 1536x1024, 1024x1536, auto.
        // 4:5 is not supported, so it falls back to the square 1:1 size.
        const sizeMap: Record<string, string> = {
          "1:1": "1024x1024",
          "9:16": "1024x1536",
          "16:9": "1536x1024",
          "4:5": "1024x1024",
        };
        const imageSize = sizeMap[job.aspectRatio ?? "1:1"] ?? "1024x1024";

        const imageModel = Deno.env.get("OPENAI_IMAGE_MODEL") || "gpt-image-2";
        const imageResponse = await generateImageWithReference(
          openAiKey,
          imageModel,
          imageSize,
          job.prompt,
          job.productImageUrl
        );

        if (!imageResponse.ok) {
          const errText = await imageResponse.text().catch(() => "");
          throw new Error(`OpenAI image generation failed (${imageResponse.status}): ${errText}`);
        }

        const imageData = await imageResponse.json();
        const item = imageData.data?.[0];

        if (!item) {
          throw new Error("OpenAI returned no image data");
        }

        // gpt-image-1 returns b64_json by default; DALL-E 3 returns a URL.
        let imageBytes: Uint8Array;
        if (item.b64_json) {
          imageBytes = Uint8Array.from(atob(item.b64_json), (c) => c.charCodeAt(0));
        } else if (item.url) {
          const imgFetch = await fetch(item.url);
          if (!imgFetch.ok) {
            throw new Error(`Failed to download generated image (${imgFetch.status})`);
          }
          imageBytes = new Uint8Array(await imgFetch.arrayBuffer());
        } else {
          throw new Error("OpenAI returned neither b64_json nor url");
        }
        const storagePath = `${job.sessionId}/${job.creativeId}-${Date.now()}.png`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, imageBytes, {
            contentType: "image/png",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        // Update ad_creatives row with image path and status.
        const { error: updateError } = await supabase
          .from("ad_creatives")
          .update({
            image_storage_path: storagePath,
            image_status: "complete",
          })
          .eq("id", job.creativeId);

        if (updateError) {
          throw new Error(`DB update failed: ${updateError.message}`);
        }

        // Delete message from queue on success.
        // pgmq_public.delete(queue_name, message_id)
        const { error: deleteError } = await supabase
          .schema("pgmq_public")
          .rpc("delete", {
            queue_name: QUEUE_NAME,
            message_id: msg.msg_id,
          });

        if (deleteError) {
          console.error("process-image-queue: delete error:", deleteError.message);
        }

        results.push({ msg_id: msg.msg_id, success: true, storagePath });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`process-image-queue: job ${msg.msg_id} failed:`, message);

        // If max retries exceeded, archive the message and mark as failed.
        if (retryCount >= MAX_RETRIES) {
          await supabase
            .schema("pgmq_public")
            .rpc("archive", {
              queue_name: QUEUE_NAME,
              message_id: msg.msg_id,
            });

          await supabase
            .from("ad_creatives")
            .update({ image_status: "failed" })
            .eq("id", job.creativeId);
        }

        results.push({ msg_id: msg.msg_id, success: false, error: message });
        // Message auto-retries after visibility timeout expires.
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("process-image-queue: fatal error:", message);
    return new Response(
      JSON.stringify({ error: "Queue processing failed", detail: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
