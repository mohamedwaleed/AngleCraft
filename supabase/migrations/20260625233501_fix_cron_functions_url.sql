-- Fix the process-image-queue cron schedule.
-- The original migration used current_setting('app.functions_url', true) which
-- is not set in the local Supabase stack, so the cron job silently failed.
-- This migration unschedules the broken job and reschedules with a direct URL.

-- Remove the broken schedule.
select cron.unschedule('process-image-queue');

-- Reschedule with the local Edge Functions URL.
-- In production, set the GUC or update this to the production URL.
select cron.schedule(
  'process-image-queue',
  '* * * * *',
  $$
    select net.http_post(
      url := 'http://127.0.0.1:54321/functions/v1/process-image-queue',
      headers := '{"Content-Type": "application/json"}'::jsonb
    )
  $$
);
