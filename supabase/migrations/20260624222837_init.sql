-- AngleCraft MVP — initial schema
-- Tables: sessions, product_inputs, buyer_insights, ad_angles, ad_creatives,
-- testing_plans, payments
-- Enums: session_status, input_type, payment_status, image_status
-- Queue: image_generation (pgmq) consumed by process-image-queue Edge Function
-- Schedule: pg_cron triggers process-image-queue

-- Extensions
create extension if not exists pgmq;
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Enums
create type session_status as enum (
  'input', 'extracting', 'analyzing', 'angles_generated',
  'paid', 'generating', 'complete', 'failed'
);
create type input_type as enum ('url', 'photo');
create type payment_status as enum ('pending', 'succeeded', 'failed');
create type image_status as enum ('pending', 'processing', 'complete', 'failed');

-- Sessions
create table sessions (
  id uuid primary key default gen_random_uuid(),
  token uuid unique not null default gen_random_uuid(),
  status session_status not null default 'input',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);
create index idx_sessions_token on sessions(token);
create index idx_sessions_status on sessions(status);
create index idx_sessions_expires_at on sessions(expires_at);

-- Product Inputs
create table product_inputs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  input_type input_type not null,
  url text,
  image_storage_path text,
  extracted_name text,
  extracted_description text,
  extracted_price text,
  extracted_features text[],
  extracted_image_url text,
  product_context jsonb,
  created_at timestamptz not null default now()
);
create index idx_product_inputs_session_id on product_inputs(session_id);

-- Buyer Insights (1:1 with session)
create table buyer_insights (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references sessions(id) on delete cascade,
  buyer_profile text not null,
  main_desire text not null,
  pain_points text[] not null,
  buying_triggers text[] not null,
  objections text[] not null,
  created_at timestamptz not null default now()
);

-- Ad Angles (5 per session)
create table ad_angles (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  angle_label text not null,
  hook text not null,
  score integer,
  is_selected boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_ad_angles_session_id on ad_angles(session_id);
create index idx_ad_angles_is_selected on ad_angles(session_id, is_selected);

-- Ad Creatives (3 per session, after payment)
create table ad_creatives (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  angle_id uuid not null references ad_angles(id) on delete cascade,
  concept text not null,
  headline text,
  primary_text text,
  cta text,
  image_storage_path text,
  image_status image_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index idx_ad_creatives_session_id on ad_creatives(session_id);
create index idx_ad_creatives_image_status on ad_creatives(image_status);

-- Testing Plans (1:1 with session, after payment)
create table testing_plans (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references sessions(id) on delete cascade,
  plan_content jsonb not null,
  created_at timestamptz not null default now()
);

-- Payments (1:1 with session)
create table payments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references sessions(id) on delete cascade,
  stripe_session_id text unique not null,
  status payment_status not null,
  amount integer not null,
  currency text not null default 'usd',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index idx_payments_status on payments(status);
create index idx_payments_session_id on payments(session_id);

-- Image generation queue (pgmq)
select pgmq.create('image_generation');

-- Schedule the process-image-queue Edge Function via pg_cron.
-- The project reference is read from the SUPABASE_URL env var at runtime via
-- net.http_post. pg_cron runs in the postgres database; pg_net is required.
-- Schedule every minute (pg_cron minimum granularity without seconds mode).
select cron.schedule(
  'process-image-queue',
  '* * * * *',
  $$
    select net.http_post(
      url := current_setting('app.functions_url', true) || '/functions/v1/process-image-queue',
      headers := '{"Content-Type": "application/json"}'::jsonb
    )
  $$
);

-- Enable row level security. The Next.js route handlers use the service-role
-- key (bypasses RLS), so these policies are permissive defaults for the anon
-- key are not required for the MVP flow. RLS is enabled to keep tables safe
-- by default; service-role access bypasses RLS.
alter table sessions enable row level security;
alter table product_inputs enable row level security;
alter table buyer_insights enable row level security;
alter table ad_angles enable row level security;
alter table ad_creatives enable row level security;
alter table testing_plans enable row level security;
alter table payments enable row level security;
