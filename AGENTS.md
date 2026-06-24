<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AngleCraft — Agent Guide

AngleCraft is an **AI Creative Strategist** that generates and organizes your next ad testing sprint. It is a Next.js 16 App Router app (React 19, TypeScript, Tailwind v4, shadcn/ui) with Supabase (Postgres, Edge Functions, Queues, Storage, Migrations) for data/AI infrastructure, OpenAI for generation, and Stripe for payments.

## Quick Reference

| Task | Command |
| --- | --- |
| Install deps | `pnpm install` |
| Dev server | `pnpm dev` (http://localhost:3000) |
| Production build | `pnpm build` |
| Start prod build | `pnpm start` |
| Lint | `pnpm lint` |
| Typecheck | `pnpm exec tsc --noEmit` |
| Supabase local stack | `pnpm exec supabase start` (requires Docker) |
| Apply migrations locally | `pnpm exec supabase migration up` |
| Reset local DB | `pnpm exec supabase db reset` |
| Push migrations to remote | `pnpm exec supabase db push` |
| Serve Edge Functions | `pnpm exec supabase functions serve --env-file ./supabase/.env --no-verify-jwt` |
| Deploy one Edge Function | `pnpm exec supabase functions deploy <name>` |
| Set Edge Function secrets | `pnpm exec supabase secrets set --env-file ./supabase/.env` |
| Stripe webhook forwarding | `stripe listen --forward-to localhost:3000/api/stripe-webhook` |

**Package manager: `pnpm`** (lockfile is `pnpm-lock.yaml`). Do not introduce `package_lock.json` or `yarn.lock`. There is no test runner configured.

## Tech Stack

- **Framework:** Next.js 16.2.9 (App Router, `app/` directory). Read `node_modules/next/dist/docs/` before touching Next APIs — this version has breaking changes vs. older releases.
- **React:** 19.2.4 (use Server/Client Components correctly; default to Server Components, add `"use client"` only when needed).
- **Language:** TypeScript 5, `strict: true`. Path alias `@/*` → project root (e.g. `@/lib/utils`, `@/components/ui/button`).
- **Styling:** Tailwind CSS v4 via `@tailwindcss/postcss`. Config lives in `app/globals.css` (`@theme inline`, CSS variables) — there is **no `tailwind.config.js`**. Uses `tw-animate-css` and `shadcn/tailwind.css`.
- **UI:** shadcn/ui (style `radix-nova`, base color `neutral`, `cssVariables: true`, `iconLibrary: lucide`). Components live in `components/ui/` and are owned by you (edit freely). Add new ones via `pnpm dlx shadcn@latest add <component>`.
- **Icons:** `lucide-react`.
- **Auth/Data:** Supabase via `@supabase/ssr` (SSR cookie-based sessions). Browser client: `@/lib/supabase/client`; Server client: `@/lib/supabase/server`; middleware refresh in `proxy.ts`. No Supabase Auth for the MVP — anonymous sessions use a custom `sessions` table with UUID token cookies.
- **Supabase CLI:** `supabase/` directory at repo root contains migrations (`supabase/migrations/`), Edge Functions (`supabase/functions/`), and `config.toml`. Coexists with Next.js — no conflicts. Requires Docker for local stack (`supabase start`).
- **Supabase Migrations:** Versioned SQL files in `supabase/migrations/`. Create with `supabase migration new <name>`, apply locally with `supabase migration up`, push to remote with `supabase db push`. Never edit the Supabase Dashboard schema directly on remote — always use migrations.
- **Supabase Edge Functions:** Deno-based TypeScript functions in `supabase/functions/`. All AI generation logic runs here (not in Next.js route handlers). Use `npm:` specifiers for imports (e.g. `import OpenAI from "npm:openai"`). Auto-injected env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Set custom secrets via `supabase secrets set`. Entry point: `Deno.serve(async (req) => { ... })`. Configure `verify_jwt` per function in `config.toml`.
- **Supabase Queue (pgmq):** Postgres-native message queue for async image generation jobs. Queue `image_generation` consumed by the `process-image-queue` Edge Function (triggered by `pg_cron` every 30s). Enqueue via `supabase.schema("pgmq_public").rpc("send", { queue_name, message })`.
- **Supabase Storage:** Private buckets (`ad-creatives`, `product-photos`) for generated/uploaded images. Database stores storage paths, not base64 blobs. Serve images via signed URLs (`createSignedUrl(path, 3600)`). Configure buckets in `supabase/config.toml`.
- **AI:** OpenAI SDK (`openai`) in Next.js for the existing `/api/chat` endpoint. In Edge Functions, use `npm:openai` with structured outputs (Zod schemas via `zodResponseFormat`). Image generation uses `gpt-image-1` via the queue consumer. Shared Zod schemas in `supabase/functions/_shared/schemas.ts`.
- **Payments:** Stripe Checkout Sessions API for one-time $9 payments. Webhook handler at `app/api/stripe-webhook/route.ts` uses `export const runtime = 'nodejs'` and raw body (`request.text()`) for signature verification.

## Project Structure

```
app/
  layout.tsx          Root layout: fonts (Inter, Space Grotesk, Geist Mono), metadata
  page.tsx            Landing page (large client component, ~1100 lines)
  globals.css         Tailwind v4 theme + design tokens
  api/
    chat/route.ts     POST endpoint -> generateChatCompletion (existing)
    extract/          POST: extract product info from URL/photo (cheerio)
    analyze/          POST: invoke analyze-product Edge Function
    angles/           POST: invoke generate-angles Edge Function
    checkout/         POST: create Stripe Checkout Session
    stripe-webhook/   POST: Stripe webhook (nodejs runtime)
    concepts/         POST: invoke generate-concepts Edge Function (paid)
    creatives/        POST: invoke generate-copy + enqueue image jobs (paid)
    testing-plan/     POST: invoke generate-testing-plan Edge Function (paid)
    download/         GET: generate PDF (@react-pdf/renderer, nodejs runtime)
  (app)/              Route group: status/, preview/, checkout/, results/ pages
components/
  ui/                 shadcn primitives (badge, button, card, input, + new)
  product-input.tsx, status-pipeline.tsx, angle-preview.tsx, etc. (client leaf components)
lib/
  utils.ts            cn() helper (clsx + tailwind-merge)
  openai.ts           OpenAI client + generateChatCompletion (existing, retained)
  supabase/
    client.ts         Browser Supabase client
    server.ts         Server Supabase client (reads cookies)
  edge-functions.ts   Helpers to invoke Supabase Edge Functions via fetch
  stripe.ts           Stripe server client
  session.ts          Anonymous session management (get/create/expire)
  extraction.ts       URL content extraction (cheerio)
  queue.ts            Supabase Queue helpers (enqueue/read/delete via pgmq_public)
  storage.ts          Supabase Storage helpers (upload/getSignedUrl)
  pdf.ts              PDF generation (@react-pdf/renderer)
  types.ts            Shared TypeScript types/interfaces
supabase/             Supabase CLI project (coexists with Next.js)
  config.toml         Local config: buckets, function settings, etc.
  migrations/
    <timestamp>_init.sql  All tables, enums, queue creation, pg_cron schedule
  functions/
    analyze-product/      Edge Function: product context + Buyer Insights
    generate-angles/      Edge Function: 5 ad angles + hooks + scoring
    generate-concepts/    Edge Function: 3 ad concepts (paid)
    generate-copy/        Edge Function: headlines, primary text, CTA (paid)
    generate-testing-plan/ Edge Function: testing plan (paid)
    process-image-queue/  Edge Function: queue consumer — image gen + storage
    _shared/              Shared Zod schemas, OpenAI/Supabase client helpers
  .env                Local Edge Function secrets (gitignored)
proxy.ts              Middleware: refreshes Supabase auth session
```

## Conventions

- **Imports:** use the `@/` alias for all project-internal imports.
- **Class merging:** always use `cn()` from `@/lib/utils` to merge Tailwind classes.
- **Fonts:** exposed as CSS variables (`--font-inter`, `--font-space-grotesk`, `--font-geist-mono`) set on `<html>` in `app/layout.tsx`. Reference via `var(--font-...)` or the `font-sans` / `font-heading` / `font-mono` theme tokens.
- **Server vs Client:** keep things as Server Components by default. `app/page.tsx` is currently a `"use client"` landing page. New interactive UI should be isolated client components.
- **API routes:** return `NextResponse.json(...)` with explicit status codes. Validate input and log errors server-side (see `app/api/chat/route.ts`).
- **Env access:** server-only secrets (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) must never be prefixed with `NEXT_PUBLIC_`. Anything read in the browser must be `NEXT_PUBLIC_*`.
- **Do not** add comments unless requested; preserve existing comments when editing.

## Environment Variables

### Next.js (`.env.local`, gitignored)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only — never expose to client)
- `OPENAI_API_KEY` (server only — used by existing `/api/chat`)
- `OPENAI_MODEL` (optional; defaults to `gpt-4o-mini` in `lib/openai.ts`)
- `STRIPE_SECRET_KEY` (server only)
- `STRIPE_WEBHOOK_SECRET` (server only)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (client-side Stripe.js)

### Supabase Edge Functions (`supabase/.env`, gitignored; set via `supabase secrets set`)

- `OPENAI_API_KEY` (Edge Functions — separate from Next.js var)
- `OPENAI_MODEL` (optional; defaults to `gpt-4o-mini`)

**Note**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are
auto-injected by the Supabase platform into Edge Functions — do not set them manually.

Never commit secrets. Never log keys. If a var is missing, the relevant helper throws explicitly.

## Verification Checklist

Before considering work done:

1. `pnpm lint` passes.
2. `pnpm exec tsc --noEmit` passes (no type errors).
3. `pnpm build` succeeds (catches App Router / RSC issues that lint/tsc miss).
4. `pnpm exec supabase db reset` applies migrations cleanly (no SQL errors).
5. `pnpm exec supabase functions serve` starts Edge Functions without errors.
6. Manually exercise changed routes/components in `pnpm dev` + `supabase functions serve` if behavior isn't covered by types.

## Notes for AI Agents

- The Supabase clients and `/api/chat` endpoint are scaffolded but **not yet wired into `app/page.tsx`** (currently a static landing page). When connecting them, follow the existing patterns in `lib/` and `app/api/chat/route.ts`.
- `proxy.ts` is the middleware file (Next.js 16 renamed `middleware.ts` → `proxy.ts`). It refreshes Supabase sessions; keep its matcher excluding static assets.
- **Supabase Edge Functions** are Deno, not Node.js. Use `npm:` specifiers for imports (e.g. `import OpenAI from "npm:openai"`). Use `Deno.env.get()` for env vars. Entry point is `Deno.serve(async (req) => { ... })`. Do not use Node.js APIs (`fs`, `path`, `Buffer`) in Edge Functions.
- **Edge Function shared code** lives in `supabase/functions/_shared/` (Zod schemas, client helpers). Import via relative paths: `import { schema } from "../_shared/schemas.ts"`.
- **Supabase Migrations** are immutable once pushed to remote. Create new migrations for schema changes — never edit applied migrations.
- **Supabase Queue** messages are JSONB. Use `pgmq_public` schema RPCs (`send`, `read`, `delete`, `archive`). Visibility timeout must exceed expected processing time. Failed messages auto-retry after timeout expires.
- **Supabase Storage** buckets are private by default. Generate signed URLs server-side (`createSignedUrl(path, 3600)`). Do not store base64 image blobs in the database — use Storage paths.
- **Stripe webhook** route must use `export const runtime = 'nodejs'` and read raw body via `await request.text()` before signature verification.
- There is no test framework. If you add one, prefer Vitest and document the run command here.
- Keep this file updated when you change build commands, conventions, or architecture.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
specs/001-ad-angle-mvp/plan.md
<!-- SPECKIT END -->
