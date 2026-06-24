# Implementation Plan: AngleCraft MVP — Ad Angle Generation & Testing Sprint

**Branch**: `001-ad-angle-mvp` | **Date**: 2026-06-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-ad-angle-mvp/spec.md`

## Summary

AngleCraft is an AI Creative Strategist that takes a product URL or photo,
analyzes the product, generates five ad angles with hooks and Buyer Insights
(free preview), then — after a $9 one-time Stripe payment — generates three
ready-to-run ad creatives (image + headline + primary text + CTA) based on the
top three AI-selected angles, plus a Meta/TikTok testing plan. The entire flow
is session-based (no auth) with a 7-day TTL.

The MVP is built on the existing Next.js 16 App Router scaffold, leveraging
Supabase-native features throughout: **Supabase Migrations** for schema
versioning, **Supabase Edge Functions** (Deno) for AI generation logic, **Supabase
Queues** (pgmq) for async image generation jobs, **Supabase Storage** for generated
ad images, and **Supabase Postgres** for session data and artifacts. Stripe
handles one-time payments. Next.js route handlers orchestrate the flow and
serve the UI, delegating AI-heavy work to Edge Functions.

## Technical Context

**Language/Version**: TypeScript 5 (`strict: true`), React 19.2.4, Next.js 16.2.9,
Deno (Supabase Edge Functions runtime)

**Primary Dependencies**:
- `next` 16.2.9 (App Router, `proxy.ts` middleware)
- `react` / `react-dom` 19.2.4
- `@supabase/ssr` ^0.12.0 + `@supabase/supabase-js` ^2.108.2 (session storage, storage, queue RPC)
- `stripe` (server-side Checkout + webhooks) — **NEW DEPENDENCY**
- `@stripe/stripe-js` (client-side redirect to Checkout) — **NEW DEPENDENCY**
- `cheerio` (URL content extraction in Next.js route handler) — **NEW DEPENDENCY**
- `@react-pdf/renderer` (server-side PDF generation) — **NEW DEPENDENCY**
- `zod` (schema validation for structured outputs — shared between Next.js and Edge Functions) — **NEW DEPENDENCY**
- `supabase` CLI (dev dependency — migrations, edge functions, local stack) — **NEW DEV DEPENDENCY**
- `shadcn/ui` + `lucide-react` (UI components)
- `tailwindcss` v4, `tw-animate-css` (styling)

**Edge Function dependencies** (Deno `npm:` imports, not in package.json):
- `npm:openai` ^6.44.0 (AI generation in Edge Functions)
- `npm:@supabase/supabase-js` ^2.108.2 (DB access in Edge Functions)
- `npm:zod` (schema validation in Edge Functions)

**Storage**: Supabase (PostgreSQL) for session data, generated artifacts, and
payment records. Anonymous sessions identified by a UUID token stored in an
HTTP-only cookie. No Supabase Auth — sessions are custom rows in a `sessions`
table with a 7-day TTL. **Supabase Storage** stores generated ad images in a
private bucket; the database stores storage paths, not base64 blobs. **Supabase
Migrations** version all schema changes in `supabase/migrations/`.

**AI Execution**: AI generation logic runs in **Supabase Edge Functions** (Deno),
not in Next.js route handlers. Edge Functions are **AI-only** — they call OpenAI
with structured outputs (Zod schemas) and return results. They do **not** write
to the database or access Supabase Storage. Next.js route handlers are the
orchestration layer: they invoke Edge Functions via `fetch`, receive results,
and handle all database writes, session updates, queue enqueueing, and angle
selection logic. Image generation jobs are enqueued to a **Supabase Queue**
(`pgmq`) by Next.js route handlers and processed asynchronously by the
`process-image-queue` Edge Function — the sole exception that writes to the
database and Storage because it is triggered by `pg_cron` (not by an HTTP
request from Next.js).

**Testing**: No test runner configured (per constitution). Verification via
`pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, and manual exercise in
`pnpm dev` + `supabase functions serve`.

**Target Platform**: Web (modern desktop browsers; responsive mobile desirable
but not P1).

**Project Type**: Web application (Next.js App Router + Supabase Edge Functions).

**Performance Goals**:
- Free preview (angles + hooks + Buyer Insights) generated in under 2 minutes
  from input submission (SC-001).
- Full campaign (3 creatives + testing plan) generated in under 3 minutes total
  from initial input (SC-002).
- 50 concurrent anonymous generation sessions without noticeable degradation
  (SC-007). Image generation via queue handles concurrency gracefully.

**Constraints**:
- Server Components by default; `"use client"` only for leaf interactive
  components (Constitution Principle I).
- No `any`; strict TypeScript (Constitution Principle II).
- Secrets in `.env.local` (Next.js) and `supabase/.env` (Edge Functions), never
  `NEXT_PUBLIC_`-prefixed for server-only keys (Constitution Principle IV).
- `pnpm` only; no `tailwind.config.js` (Constitution Principle V).
- All verification gates must pass before completion (Constitution Principle III).
- Edge Function wall-clock limit: 150s (free) / 900s (pro). CPU limit: 2s per
  request. Image generation offloaded to queue to stay within limits.
- Edge Functions use `npm:` specifiers (Deno), not `package.json` imports.

**Scale/Scope**: MVP for single-user anonymous sessions; 50 concurrent sessions
target. No accounts, no cross-device sync, no multi-tenant isolation beyond
session-scoped data.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. App Router & Server-Component First | ✅ PASS | All routes use `app/` directory. New pages default to Server Components; interactive status flows and forms isolated as client leaf components. Data fetching in Server Components / route handlers. `proxy.ts` retained for session cookie handling. AI logic delegated to Supabase Edge Functions — route handlers call them via `fetch`, keeping Next.js as the routing/UI surface. |
| II. Type Safety & Strictness | ✅ PASS | `strict: true` maintained. `@/*` alias for all Next.js imports. No `any` — Zod schemas shared between Next.js and Edge Functions provide runtime validation. API routes validate input and return `NextResponse.json()` with status codes. Edge Functions use Deno TypeScript with explicit interfaces. |
| III. Verification Gates | ✅ PASS | `pnpm lint` → `pnpm exec tsc --noEmit` → `pnpm build` → manual dev exercise. Edge Functions tested via `supabase functions serve` locally. All gates required before completion. |
| IV. Secret & Environment Discipline | ✅ PASS | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` are server-only (no `NEXT_PUBLIC_`). `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is public. OpenAI key is set as a Supabase secret (`supabase secrets set`) for Edge Functions — never in `NEXT_PUBLIC_*`. Supabase service-role key remains server-only. Edge Function auto-secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are injected by the platform. |
| V. Conventions Over Invention | ✅ PASS | `cn()` for class merging. Tailwind v4 in `app/globals.css`. shadcn/ui via `pnpm dlx shadcn@latest add`. `pnpm` only. Existing patterns in `lib/openai.ts` and `app/api/chat/route.ts` followed for Next.js route handlers. Supabase CLI conventions followed for `supabase/` directory structure. |

**New environment variables** — Next.js (`.env.local`):
- `STRIPE_SECRET_KEY` (server only)
- `STRIPE_WEBHOOK_SECRET` (server only)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (client-side Checkout)

**Supabase secrets** (set via `supabase secrets set`):
- `OPENAI_API_KEY` (Edge Functions)
- `OPENAI_MODEL` (Edge Functions, optional, defaults to `gpt-4o-mini`)

**Gate Result**: PASS — no violations. Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-ad-angle-mvp/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── api-contracts.md
│   └── ai-contracts.md
└── tasks.md             # Phase 2 output (NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/
├── layout.tsx                    # Root layout (existing, fonts + metadata)
├── page.tsx                      # Landing page (existing — add input form section)
├── globals.css                   # Tailwind v4 theme (existing)
├── (app)/                        # Route group for app flow
│   ├── status/
│   │   └── page.tsx              # Pre-payment status page (3-step pipeline)
│   ├── preview/
│   │   └── page.tsx              # Free preview: angles, hooks, Buyer Insights
│   ├── checkout/
│   │   └── page.tsx              # Post-payment status page (3-step generation)
│   └── results/
│       └── page.tsx              # Full campaign results: 3 creatives + testing plan
├── api/
│   ├── chat/route.ts             # Existing chat endpoint (retained)
│   ├── extract/route.ts          # POST: extract product info from URL or photo (cheerio)
│   ├── analyze/route.ts          # POST: invoke edge function → Buyer Insights
│   ├── angles/route.ts           # POST: invoke edge function → 5 ad angles + hooks
│   ├── select-angles/route.ts    # POST: invoke edge function → score + select top 3
│   ├── concepts/route.ts         # POST: invoke edge function → 3 ad concepts (paid)
│   ├── creatives/route.ts        # POST: enqueue image gen jobs + invoke edge function for copy (paid)
│   ├── testing-plan/route.ts     # POST: invoke edge function → testing plan (paid)
│   ├── checkout/route.ts         # POST: create Stripe Checkout Session
│   ├── stripe-webhook/route.ts   # POST: Stripe webhook handler
│   └── download/route.ts         # GET: generate and return PDF
└── (landing)/
    └── page.tsx                  # Landing page moved here if route group used

components/
├── ui/                           # shadcn primitives (existing + new additions)
│   ├── badge.tsx                 # existing
│   ├── button.tsx                # existing
│   ├── card.tsx                  # existing
│   ├── input.tsx                 # existing
│   ├── progress.tsx              # NEW: add via shadcn
│   ├── separator.tsx             # NEW: add via shadcn
│   ├── tabs.tsx                  # NEW: add via shadcn
│   └── textarea.tsx              # NEW: add via shadcn
├── product-input.tsx             # Client: URL input + photo upload form
├── status-pipeline.tsx           # Client: 3-step status flow (pre & post payment)
├── angle-preview.tsx             # Client: free preview display with copy buttons
├── buyer-insights.tsx            # Client: Buyer Insights display
├── creative-card.tsx             # Client: single ad creative display (image + copy + CTA)
├── testing-plan-view.tsx         # Client: testing plan display with copy
├── checkout-button.tsx           # Client: Stripe checkout redirect button
├── download-pdf-button.tsx       # Client: trigger PDF download
└── copy-button.tsx               # Client: reusable copy-to-clipboard button

lib/
├── utils.ts                      # cn() helper (existing)
├── openai.ts                     # OpenAI client (existing — retained for /api/chat)
├── supabase/
│   ├── client.ts                 # Browser Supabase client (existing)
│   └── server.ts                 # Server Supabase client (existing)
├── edge-functions.ts             # NEW: helpers to invoke Supabase Edge Functions
├── stripe.ts                     # NEW: Stripe server client
├── session.ts                    # NEW: session management (get/create/expire)
├── extraction.ts                 # NEW: URL content extraction (cheerio)
├── queue.ts                      # NEW: Supabase Queue helpers (enqueue/read/delete)
├── storage.ts                    # NEW: Supabase Storage helpers (upload/getPublicUrl)
├── pdf.ts                        # NEW: PDF generation (@react-pdf/renderer)
└── types.ts                      # NEW: shared TypeScript types/interfaces

supabase/                         # Supabase CLI project (NEW)
├── config.toml                   # Supabase local config (buckets, functions, etc.)
├── migrations/
│   └── <timestamp>_init.sql      # All tables, enums, queue creation, indexes
├── functions/
│   ├── analyze-product/          # Edge Function (AI-only): product context + Buyer Insights
│   │   └── index.ts
│   ├── generate-angles/          # Edge Function (AI-only): 5 ad angles + hooks + scoring
│   │   └── index.ts
│   ├── generate-concepts/        # Edge Function (AI-only): 3 ad concepts (paid)
│   │   └── index.ts
│   ├── generate-copy/            # Edge Function (AI-only): headlines, primary text, CTA (paid)
│   │   └── index.ts
│   ├── generate-testing-plan/    # Edge Function (AI-only): testing plan (paid)
│   │   └── index.ts
│   ├── process-image-queue/      # Edge Function (cron-triggered, self-contained): queue consumer
│   │   └── index.ts              #   reads queue, calls OpenAI, uploads to Storage, writes DB
│   └── _shared/
│       ├── schemas.ts            # Shared Zod schemas (imported by all functions)
│       ├── openai-client.ts      # Shared OpenAI client helper
│       └── supabase-client.ts    # Shared Supabase client helper (used only by process-image-queue)
└── .env                          # Local edge function secrets (gitignored)

proxy.ts                           # Middleware (existing — add session cookie handling)
```

**Structure Decision**: Next.js App Router project coexisting with a Supabase
CLI project at the repo root. The `supabase/` directory contains migrations,
Edge Functions, and config — it is independent of the Next.js `app/` directory
and ignored by the Next.js build. Next.js route handlers are the orchestration
layer: they handle session management, Stripe, URL extraction, PDF generation,
all database writes, queue enqueueing, and angle selection logic. They delegate
AI generation to Supabase Edge Functions via `fetch` — Edge Functions are
AI-only (call OpenAI, return results, no DB writes). Image generation is
asynchronous: the `/api/creatives` route handler enqueues image jobs to the
Supabase Queue, and the `process-image-queue` Edge Function (cron-triggered,
self-contained) consumes the queue, generates images with OpenAI, uploads them
to Supabase Storage, and updates the database. The Next.js status page polls
for completion.

## Complexity Tracking

> No Constitution Check violations — table left empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

## Constitution Re-Check (Post-Design)

*GATE: Re-evaluated after Phase 1 design artifacts are complete.*

| Principle | Status | Post-Design Notes |
|-----------|--------|-------------------|
| I. App Router & Server-Component First | ✅ PASS | All new pages are Server Components. Client components are leaf components. Next.js route handlers are the orchestration layer (session, DB, queue, Stripe, extraction, PDF); AI logic is delegated to Supabase Edge Functions which are AI-only (no DB writes, except `process-image-queue` which is cron-triggered). `proxy.ts` retained. No Pages Router. Data fetching stays in Server Components / route handlers. |
| II. Type Safety & Strictness | ✅ PASS | Shared Zod schemas in `supabase/functions/_shared/schemas.ts` validate all AI structured outputs. TypeScript interfaces in `lib/types.ts`. All API routes validate input and return `NextResponse.json()` with status codes. Edge Functions use Deno TypeScript with explicit types. No `any`. |
| III. Verification Gates | ✅ PASS | Gates documented in quickstart.md. `pnpm lint`, `tsc --noEmit`, `pnpm build` for Next.js. `supabase functions serve` for local Edge Function testing. All gates required. |
| IV. Secret & Environment Discipline | ✅ PASS | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` server-only. OpenAI key set as Supabase secret for Edge Functions — never in `NEXT_PUBLIC_*`. Edge Function auto-secrets injected by platform. Storage bucket is private (signed URLs or server-side reads). No secrets in client props. |
| V. Conventions Over Invention | ✅ PASS | `cn()` for class merging. Tailwind v4, no `tailwind.config.js`. shadcn/ui via `pnpm dlx`. `pnpm` only. Supabase CLI conventions for `supabase/` directory. Existing `lib/` and route handler patterns followed. |

**Post-Design Gate Result**: PASS — no violations. All five Constitution
principles are satisfied by the Phase 1 design. The plan is ready for
`/speckit-tasks` to generate the implementation task list.
