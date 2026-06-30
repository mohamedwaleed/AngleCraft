-- Add placement and aspect_ratio columns to ad_creatives.
-- placement: AI-inferred recommended ad placement (e.g. "Meta Feed",
--   "TikTok Feed", "Instagram Stories", "TikTok Reels").
-- aspect_ratio: the image aspect ratio for this placement
--   (1:1, 9:16, 16:9, or 4:5).

alter table ad_creatives
  add column if not exists placement text,
  add column if not exists aspect_ratio text;
