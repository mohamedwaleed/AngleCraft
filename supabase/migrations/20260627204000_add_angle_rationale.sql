-- AngleCraft feedback-driven schema additions
-- 1. Store the AI's rationale for why each ad angle works.
-- 2. Store optional text overlay for generated creative images.

alter table ad_angles add column rationale text;

alter table ad_creatives add column image_text text;
