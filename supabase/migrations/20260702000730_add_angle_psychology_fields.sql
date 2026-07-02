-- Add rich buyer-psychology fields to ad_angles for the redesigned angle generation stage.
-- The AI generates these fields; the backend still scores and ranks deterministically.
-- Existing rows backfill with empty strings so the type layer can assume non-null values.

alter table ad_angles
  add column angle_name text not null default '',
  add column buyer_emotion text not null default '',
  add column purchase_motivation text not null default '',
  add column psychological_trigger text not null default '',
  add column problem_solved text not null default '',
  add column ideal_audience text not null default '',
  add column use_case text not null default '';
