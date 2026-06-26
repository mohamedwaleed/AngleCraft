// Supabase Queue helpers (pgmq).
// The `image_generation` queue is consumed by the `process-image-queue` Edge
// Function (triggered by pg_cron). Next.js route handlers enqueue image
// generation jobs via the `pgmq_public` schema, which is created by enabling
// "Expose Queues via PostgREST" in the Supabase Dashboard.
// See: https://supabase.com/docs/guides/queues/api

import { createClient } from "@/lib/supabase/server";
import type { ImageQueueMessage } from "@/lib/types";

export const IMAGE_GENERATION_QUEUE = "image_generation";

/**
 * Enqueue an image generation job. The `process-image-queue` Edge Function
 * will pick it up asynchronously.
 */
export async function enqueueImageJob(job: ImageQueueMessage): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .schema("pgmq_public")
    .rpc("send", {
      queue_name: IMAGE_GENERATION_QUEUE,
      message: job,
    });

  if (error) {
    throw new Error(`Failed to enqueue image job: ${error.message}`);
  }
}

/**
 * Enqueue multiple image generation jobs in a single batch.
 */
export async function enqueueImageJobs(jobs: ImageQueueMessage[]): Promise<void> {
  const supabase = await createClient();

  for (const job of jobs) {
    const { error } = await supabase
      .schema("pgmq_public")
      .rpc("send", {
        queue_name: IMAGE_GENERATION_QUEUE,
        message: job,
      });

    if (error) {
      throw new Error(`Failed to enqueue image job: ${error.message}`);
    }
  }
}
