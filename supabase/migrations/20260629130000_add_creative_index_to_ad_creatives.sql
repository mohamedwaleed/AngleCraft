-- Add a stable creative index to ad_creatives so the pipeline can map generated
-- concepts, copy, and testing-plan strategies to the correct row regardless of
-- insertion order or fetch order.

alter table ad_creatives
  add column creative_index smallint not null default 0;

create index idx_ad_creatives_creative_index
  on ad_creatives(session_id, creative_index);
