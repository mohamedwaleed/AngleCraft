# Research: AngleCraft MVP — Ad Angle Generation & Testing Sprint

**Date**: 2026-06-24
**Feature**: [spec.md](./spec.md) | [plan.md](./plan.md)

## Research Questions

The Technical Context in plan.md identified these unknowns and integration
points requiring research:

1. Next.js 16 App Router API patterns (route handlers, params, cookies, file uploads)
2. Stripe one-time payment integration pattern
3. OpenAI structured outputs for JSON generation
4. OpenAI image generation for ad creatives
5. URL content extraction approach
6. PDF generation approach
7. Anonymous session storage in Supabase
8. Supabase Migrations for schema versioning
9. Supabase Edge Functions for AI generation
10. Supabase Queue (pgmq) for async image generation
11. Supabase Storage for generated images

---

## Decision 1: Next.js 16 App Router API Patterns

**Decision**: Use Next.js 16 App Router conventions with async `params`, `cookies()`, and route handlers.

**Rationale**: The project is already on Next.js 16.2.9. Key breaking changes vs older Next.js that affect this feature:
- `params` is now a `Promise` — must `await` in all dynamic route pages and route handlers.
- `cookies()` is now async — must `await cookies()` in Server Components and route handlers.
- `proxy.ts` is the middleware file (not `middleware.ts`) — already in place.
- Route handlers use `request.json()` for JSON bodies and `request.formData()` for file uploads.
- Server Actions are available but we'll use route handlers for API-style calls (more testable, consistent with existing `app/api/chat/route.ts`).

**Alternatives considered**:
- Server Actions for form submissions — rejected for API-style generation calls because route handlers are more consistent with the existing `app/api/chat/route.ts` pattern and easier to call from client components via `fetch`.
- Edge Runtime for route handlers — rejected for webhook and PDF routes because they need Node.js APIs (crypto for Stripe verification, buffer operations).

**Key patterns**:
- Route handler: `export async function POST(request: Request) { ... return NextResponse.json(...) }`
- Dynamic params: `{ params }: { params: Promise<{ sessionId: string }> }` then `const { sessionId } = await params`
- Cookies: `const cookieStore = await cookies()` then `cookieStore.get('session_token')`
- File upload: `const formData = await request.formData(); const file = formData.get('photo') as File`
- Set cookie: `cookieStore.set('session_token', token, { httpOnly: true, maxAge: 604800 })`

---

## Decision 2: Stripe One-Time Payment Integration

**Decision**: Use Stripe Checkout Sessions API for one-time $9 payments with webhook-based fulfillment.

**Rationale**: Stripe Checkout is the simplest secure way to handle one-time payments. Stripe hosts the checkout page (PCI compliance handled), and webhooks confirm payment asynchronously.

**Packages**: `stripe` (server), `@stripe/stripe-js` (client redirect)

**Flow**:
1. `POST /api/checkout` — create Checkout Session with `mode: 'payment'`, `line_items` for $9, `success_url` and `cancel_url` pointing back to the app with session token in query param.
2. Client redirects to `session.url` via `window.location.href`.
3. Stripe redirects to `success_url` after payment.
4. `POST /api/stripe-webhook` — receives webhook, verifies signature with raw body (`request.text()`), handles `checkout.session.completed` event, marks session as paid.
5. On return to app, the page checks payment status via Supabase and unlocks outputs.

**Gotchas addressed**:
- Webhook route uses `export const runtime = 'nodejs'` (not Edge) for crypto support.
- Raw body read via `await request.text()` before Stripe signature verification.
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are server-only env vars (no `NEXT_PUBLIC_` prefix).
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` for client-side Stripe.js loading.
- Duplicate charge prevention: check if session already has a succeeded payment before creating a new Checkout Session.

**Alternatives considered**:
- Stripe Payment Intents directly — rejected, more complex and requires handling card UI ourselves.
- Stripe Payment Links — rejected, no webhook customization or session-specific metadata.

---

## Decision 3: OpenAI Structured Outputs

**Decision**: Use OpenAI Structured Outputs with Zod schemas via `openai.beta.chat.completions.parse()`.

**Rationale**: Structured Outputs guarantee valid JSON matching our schema, which is critical for generating consistent ad angles, concepts, creatives, and testing plans. Zod provides TypeScript type safety and runtime validation.

**Packages**: `openai` ^6.44.0 (already installed for Next.js; `npm:openai` in Edge Functions), `zod` (NEW)

**Pattern** (in Edge Functions):
```typescript
import OpenAI from "npm:openai";
import { zodResponseFormat } from "npm:openai/helpers/zod";
import { z } from "npm:zod";

const angleSchema = z.object({
  angle: z.string(),
  hook: z.string(),
});

const response = await openai.beta.chat.completions.parse({
  model: Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini",
  messages: [...],
  response_format: zodResponseFormat(anglesSchema, "ad_angles"),
});

const parsed = response.choices[0].message.parsed; // typed
```

**Gotchas addressed**:
- Only works with `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo` — the project defaults to `gpt-4o-mini` which supports structured outputs.
- Use `.parse()` method (not `.create()`) for structured outputs.
- Zod schemas are shared in `supabase/functions/_shared/schemas.ts` and imported by all Edge Functions.
- The existing `lib/openai.ts` `generateChatCompletion` is retained for the existing `/api/chat` endpoint.

**Alternatives considered**:
- Raw JSON mode (`response_format: { type: "json_object" }`) — rejected, doesn't guarantee schema compliance.
- Manual JSON parsing with try/catch — rejected, fragile and error-prone.

---

## Decision 4: OpenAI Image Generation via Queue

**Decision**: Use `gpt-image-1` for ad creative image generation, processed asynchronously via Supabase Queue, with images stored in Supabase Storage.

**Rationale**: Image generation is the slowest step (5-15s per image, 3 images needed). Running it synchronously in an Edge Function risks hitting wall-clock limits under load. Supabase Queue (pgmq) provides durable, exactly-once delivery with automatic retry on failure. Supabase Storage keeps the database lean (no base64 blobs) and provides CDN-backed image delivery.

**Flow**:
1. `/api/creatives` route handler enqueues 3 image generation jobs to the `image_generation` queue via `pgmq_public.send`.
2. Each queue message contains: `session_id`, `angle_id`, `concept`, `prompt`.
3. The `process-image-queue` Edge Function is triggered (via cron or polling) and reads messages from the queue.
4. For each message, the Edge Function:
   a. Calls `openai.images.generate()` with `model: "gpt-image-1"`.
   b. Uploads the resulting base64 image to Supabase Storage (`ad-creatives` bucket).
   c. Updates the `ad_creatives` row with the storage path.
   d. Deletes the queue message on success.
   e. On failure, sets a visibility timeout for retry (max 3 retries, then archive).
5. The Next.js status page polls the session status until all 3 images are ready.

**Packages**: `npm:openai` ^6.44.0 (in Edge Function), `npm:@supabase/supabase-js` ^2.108.2 (in Edge Function)

**Queue setup** (in migration):
```sql
create extension if not exists pgmq;
select pgmq.create('image_generation');
```

**Storage setup** (in `config.toml` + migration):
```toml
[storage.buckets.ad-creatives]
public = false
file_size_limit = "10MiB"
allowed_mime_types = ["image/png"]
```

**Gotchas addressed**:
- `gpt-image-1` always returns base64 (no URL option) — upload to Storage immediately.
- DALL-E 3 / gpt-image-1 only support `n=1` — generate 3 images as separate queue jobs.
- Queue visibility timeout: set to 120s for image generation (longer than expected generation time).
- Max 3 retries with exponential backoff (60s, 120s, 300s) via `pgmq.set_vt`.
- Storage bucket is private — images served via signed URLs or server-side reads (not publicly accessible).
- Edge Function `process-image-queue` has `verify_jwt = false` in config.toml (called by cron, not by users).

**Alternatives considered**:
- Synchronous image generation in Edge Function — rejected, risks timeout under load and blocks the user.
- Synchronous image generation in Next.js route handler — rejected, same timeout risk and doesn't leverage Supabase's infrastructure.
- `dall-e-3` — rejected, higher cost and slower for comparable quality.
- Storing base64 in the database — rejected, bloats the database and doesn't scale.

---

## Decision 5: URL Content Extraction

**Decision**: Use `fetch` + `cheerio` for HTML parsing in a Next.js route handler, then pass extracted text + image to an Edge Function for product context analysis. No Puppeteer for the MVP.

**Rationale**: Cheerio is lightweight (5MB memory, ~5ms parse) and works in Node.js route handlers without a browser. Most product pages (Amazon, Shopify) have enough static HTML for extraction. For pages that block or are JS-rendered, we surface a friendly error and invite the user to upload a photo instead. The extracted text is passed to the `analyze-product` Edge Function for AI analysis.

**Packages**: `cheerio` (NEW — Next.js dependency only)

**Flow**:
1. `POST /api/extract` receives URL (in Next.js route handler).
2. `fetch(url)` with a browser-like User-Agent header.
3. Parse HTML with cheerio — extract `<title>`, `<meta>` description, `<h1>`, price selectors, `og:image`.
4. If extraction yields too little (no title, no image), return error prompting photo upload.
5. Store extracted text in `product_inputs` table.
6. The `/api/analyze` route handler invokes the `analyze-product` Edge Function with the extracted text (and image URL for vision analysis).

**Gotchas addressed**:
- Amazon/Shopify may block server-side fetch — if we get a 403/captcha page, surface a friendly error.
- Token cost: preprocess with cheerio first, send only relevant text to the Edge Function.
- Timeout: set a 10-second fetch timeout to avoid hanging.

**Alternatives considered**:
- Puppeteer for JS-rendered pages — rejected for MVP, too heavy (memory, cold start).
- Doing extraction inside an Edge Function — rejected, Edge Functions have 6MB request size limit and 2s CPU limit; cheerio parsing is better suited to Node.js route handlers.

---

## Decision 6: PDF Generation

**Decision**: Use `@react-pdf/renderer` to generate formatted PDFs server-side in a Next.js route handler.

**Rationale**: `@react-pdf/renderer` renders React components to PDF without a browser instance, making it ideal for Next.js route handlers. It supports text, images (from Storage URLs), styling, and multi-page layouts. Unlike Puppeteer, it doesn't need 150-300MB of memory.

**Packages**: `@react-pdf/renderer` (NEW — Next.js dependency)

**Pattern**:
```typescript
import { renderToBuffer } from "@react-pdf/renderer";

// In /api/download route handler
const buffer = await renderToBuffer(<CampaignPDF data={...} />);
return new NextResponse(buffer, {
  headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=anglecraft-campaign.pdf" },
});
```

**Gotchas addressed**:
- Route uses `export const runtime = 'nodejs'` (not Edge).
- Images fetched from Supabase Storage signed URLs and embedded in the PDF.
- Font: use default Helvetica (built into @react-pdf/renderer).

**Alternatives considered**:
- Puppeteer (HTML → PDF) — rejected, 150-300MB memory per browser instance.
- PDFKit — rejected, no layout engine, manual positioning is tedious.
- Generating PDF in an Edge Function — rejected, @react-pdf/renderer needs Node.js APIs.

---

## Decision 7: Anonymous Session Storage in Supabase

**Decision**: Custom `sessions` table in Supabase with UUID token stored in an HTTP-only cookie. No Supabase Auth. 7-day TTL with app-side expiry check and lazy cleanup.

**Rationale**: The spec requires no auth/login. Supabase Auth is overkill and would add unnecessary complexity. A custom sessions table with a UUID token cookie is simple, secure, and gives full control over the data model and TTL.

**Schema** (detailed in data-model.md, managed via Supabase Migrations):
- `sessions` table: `id`, `token`, `status`, `created_at`, `expires_at`
- `product_inputs`, `buyer_insights`, `ad_angles`, `ad_creatives`, `testing_plans`, `payments` tables

**Flow**:
1. On first input submission, create a session row with a new UUID token.
2. Set `session_token` cookie (HTTP-only, 7-day maxAge).
3. All subsequent API calls read the token from the cookie and look up the session.
4. On each session access, check `expires_at` — if expired, return a "session expired" error.
5. Cleanup: lazy deletion on access + optional `pg_cron` scheduled cleanup.

**Gotchas addressed**:
- Cookie is HTTP-only to prevent XSS token theft.
- `secure: true` in production, `sameSite: 'lax'`.
- UUID v4 tokens (collision risk negligible).
- All data access is server-side via route handlers and Edge Functions using the service-role key.
- No PII stored (no email, no name) — just product data and generated content.

**Alternatives considered**:
- Supabase Auth with anonymous sign-in — rejected, adds auth complexity and the spec explicitly says no auth/login.
- JWT tokens instead of database-backed sessions — rejected, can't persist generated artifacts server-side.

---

## Decision 8: Supabase Migrations for Schema Versioning

**Decision**: Use the Supabase CLI and `supabase/migrations/` directory for all database schema changes.

**Rationale**: Supabase Migrations provide version-controlled, sequential SQL files that keep local and remote databases in sync. This is the standard Supabase workflow and avoids manual SQL execution in the Dashboard.

**CLI commands**:
```bash
supabase migration new init           # Create migration file
supabase migration up                 # Apply locally
supabase db push                      # Push to remote
supabase db reset                     # Reset local to migrations
```

**Directory structure**:
```text
supabase/
├── migrations/
│   └── <timestamp>_init.sql    # All tables, enums, queues, indexes
├── config.toml
└── seed.sql                    # Optional seed data
```

**Gotchas addressed**:
- Migrations are immutable once pushed — create new migrations for changes.
- `supabase db reset` deletes all local data — use carefully.
- The `supabase/` directory coexists with Next.js at the repo root with no conflicts.
- Docker required for local Supabase stack (`supabase start`).

**Alternatives considered**:
- Manual SQL execution in Supabase Dashboard — rejected, not version-controlled, error-prone.
- Third-party migration tools (Prisma Migrate, Drizzle Kit) — rejected, Supabase CLI is the native tool and sufficient for this project.

---

## Decision 9: Supabase Edge Functions for AI Generation

**Decision**: All AI generation logic (product analysis, angle generation, concept generation, copy generation, testing plan generation, image generation) runs in Supabase Edge Functions (Deno). Next.js route handlers invoke them via `fetch`. Edge Functions are **AI-only** — they call OpenAI and return structured results. They do **not** write to the database or access Supabase Storage. All database writes, session updates, queue enqueueing, and angle selection logic are handled by the Next.js route handlers that invoke them.

**Rationale**: Edge Functions run close to the OpenAI API, reducing latency. They keep AI logic and OpenAI keys out of the Next.js process, improving security isolation. Deno's `npm:` specifier allows using the OpenAI SDK and Zod without a bundler. Keeping Edge Functions AI-only (no DB writes) provides a clean separation of concerns: Edge Functions are stateless and testable (input → OpenAI → output), while Next.js route handlers own all state management and persistence. This also means Edge Functions don't need the Supabase service-role key for most operations, reducing the blast radius of a compromised function.

**Exception**: `process-image-queue` is cron-triggered (not invoked by Next.js) and therefore must handle its own queue reads, Storage uploads, and database updates — there is no HTTP request from Next.js to delegate the non-AI work to.

**Edge Functions** (in `supabase/functions/`):
| Function | Purpose | Trigger | Writes to DB? |
|----------|---------|---------|---------------|
| `analyze-product` | Product context + Buyer Insights | Called by `/api/analyze` | No — returns results |
| `generate-angles` | 10 candidate angles + hooks + deterministic scoring + top-5 selection | Called by `/api/angles` | No — returns results |
| `generate-concepts` | 3 ad concepts (paid) | Called by `/api/concepts` | No — returns results |
| `generate-copy` | Headlines, primary text, CTA (paid) | Called by `/api/creatives` | No — returns results |
| `generate-testing-plan` | Testing plan (paid) | Called by `/api/testing-plan` | No — returns results |
| `process-image-queue` | Queue consumer: image gen + storage | Cron / polling | **Yes** (self-contained) |

**Shared code** (in `supabase/functions/_shared/`):
- `schemas.ts` — Zod schemas for all structured outputs
- `openai-client.ts` — OpenAI client helper
- `supabase-client.ts` — Supabase client helper (used only by `process-image-queue`)

**Calling pattern** (from Next.js route handler):
```typescript
// 1. Call Edge Function (AI-only)
const response = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-product`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ productName, productDescription, productFeatures, imageUrl }),
  }
);
const { productContext, buyerInsights } = await response.json();

// 2. Write results to database (Next.js route handler, not Edge Function)
await supabase.from("buyer_insights").insert({ session_id: sessionId, ...buyerInsights });
await supabase.from("product_inputs").update({ product_context: productContext }).eq("session_id", sessionId);
```

**Gotchas addressed**:
- Edge Functions have 150s wall-clock / 2s CPU limit — text generation is fast enough; image generation is offloaded to the queue.
- `verify_jwt = false` for functions called server-side with the anon key (not user JWT).
- CORS: not needed since calls come from Next.js route handlers (server-side), not the browser.
- Cold starts: design for idempotent operations.
- Secrets: `OPENAI_API_KEY` set via `supabase secrets set`, not in `NEXT_PUBLIC_*`.
- AI-only Edge Functions don't need `SUPABASE_SERVICE_ROLE_KEY` — only `process-image-queue` does (auto-injected by platform).

**Alternatives considered**:
- AI generation in Next.js route handlers — rejected, mixes AI logic with routing, exposes OpenAI key to the Next.js process, and doesn't leverage edge proximity to OpenAI.
- Edge Functions that also write to DB — rejected, mixes concerns and makes Edge Functions harder to test and reason about. Clean separation: Edge Functions are stateless AI callers, Next.js route handlers own state.
- AI generation in a separate backend service — rejected, adds infrastructure; Edge Functions are already integrated with Supabase.

---

## Decision 10: Supabase Queue (pgmq) for Image Generation

**Decision**: Use Supabase Queue (`pgmq` extension) for asynchronous image generation jobs. The `process-image-queue` Edge Function consumes the queue.

**Rationale**: Image generation is the slowest and most resource-intensive step. The queue decouples job submission from job execution, providing:
- **Resilience**: Failed jobs automatically retry (visibility timeout).
- **Concurrency control**: Jobs processed one at a time, preventing OpenAI rate limits.
- **Durability**: Jobs persist in Postgres — no lost work on function cold start or crash.
- **Observability**: Queue depth and message age visible in Supabase Dashboard.

**Queue setup** (in migration):
```sql
create extension if not exists pgmq;
select pgmq.create('image_generation');
```

**Enqueue** (from Next.js route handler via Supabase client):
```typescript
await supabase.schema("pgmq_public").rpc("send", {
  queue_name: "image_generation",
  message: { sessionId, angleId, concept, prompt },
});
```

**Dequeue + process** (in `process-image-queue` Edge Function):
```typescript
const { data: messages } = await supabase.schema("pgmq_public").rpc("read", {
  queue_name: "image_generation",
  vt: 120,  // 2-minute visibility timeout
  n: 3,     // Read up to 3 messages
});

for (const msg of messages) {
  try {
    const image = await openai.images.generate({ model: "gpt-image-1", prompt: msg.message.prompt });
    const bytes = Uint8Array.from(atob(image.data[0].b64_json), c => c.charCodeAt(0));
    await supabase.storage.from("ad-creatives").upload(`${sessionId}/${angleId}.png`, bytes, { contentType: "image/png" });
    await supabase.from("ad_creatives").update({ image_storage_path: `${sessionId}/${angleId}.png` }).eq("angle_id", msg.message.angleId);
    await supabase.schema("pgmq_public").rpc("delete", { queue_name: "image_generation", msg_id: msg.msg_id });
  } catch (err) {
    // Message remains invisible for vt seconds, then retried automatically
  }
}
```

**Trigger**: `pg_cron` scheduled every 30 seconds to invoke the Edge Function:
```sql
select cron.schedule('process-image-queue', '*/30 seconds * * * *',
  $$select net.http_post(
    url := 'https://<project>.supabase.co/functions/v1/process-image-queue',
    headers := '{"Content-Type": "application/json"}'::jsonb
  )$$
);
```

**Retry logic**: Max 3 retries. On each failure, set visibility timeout to 60s, 120s, 300s. After 3 failures, archive the message and mark the creative as failed.

**Gotchas addressed**:
- `pgmq` requires Postgres 15.6.1.143+.
- Must enable "Expose Queues via PostgREST" in Dashboard for `pgmq_public` schema.
- Visibility timeout must be longer than expected processing time (120s for image gen).
- Queue messages are JSONB — flexible payload format.
- Edge Function `process-image-queue` has `verify_jwt = false` (called by cron).

**Alternatives considered**:
- Synchronous image generation — rejected, risks timeout and blocks user.
- External queue (BullMQ, SQS) — rejected, adds infrastructure; pgmq is Postgres-native and already available.
- Next.js background processing — rejected, no durable job queue in Next.js.

---

## Decision 11: Supabase Storage for Generated Images

**Decision**: Store generated ad images in a private Supabase Storage bucket (`ad-creatives`). The database stores storage paths, not base64 blobs. Images are served via signed URLs.

**Rationale**: Supabase Storage provides CDN-backed, scalable file storage with access control. Storing base64 in the database would bloat rows and degrade query performance. Signed URLs allow time-limited access to private images without making the bucket public.

**Bucket setup** (in `config.toml` + migration):
```toml
[storage.buckets.ad-creatives]
public = false
file_size_limit = "10MiB"
allowed_mime_types = ["image/png"]
```

**Upload** (from Edge Function):
```typescript
const { data, error } = await supabase.storage
  .from("ad-creatives")
  .upload(`${sessionId}/${angleId}.png`, bytes, { contentType: "image/png" });
```

**Get signed URL** (from Next.js route handler):
```typescript
const { data } = await supabase.storage
  .from("ad-creatives")
  .createSignedUrl(`${sessionId}/${angleId}.png`, 3600); // 1-hour expiry
```

**Database column**: `ad_creatives.image_storage_path` (text) instead of `image_base64`.

**Gotchas addressed**:
- Bucket is private — images not publicly accessible.
- Signed URLs expire (1 hour default) — generate fresh URLs on each page load.
- File paths are session-scoped: `{sessionId}/{angleId}.png`.
- `next/image` can display signed URLs (configure `remotePatterns` for Supabase domain).

**Alternatives considered**:
- Public bucket — rejected, generated images should not be publicly listable.
- Base64 in database — rejected, bloats database and doesn't scale.
- External storage (S3, Cloudinary) — rejected, Supabase Storage is already integrated.

---

## New Dependencies Summary

### Next.js dependencies (via `pnpm add`)

| Package | Purpose | Server/Client |
|---------|---------|---------------|
| `stripe` | Stripe Checkout + webhook verification | Server |
| `@stripe/stripe-js` | Client-side redirect to Stripe Checkout | Client |
| `zod` | Schema validation (shared types reference) | Server |
| `cheerio` | HTML parsing for URL extraction | Server |
| `@react-pdf/renderer` | PDF generation from React components | Server |

### Next.js dev dependencies (via `pnpm add -D`)

| Package | Purpose |
|---------|---------|
| `supabase` | Supabase CLI — migrations, edge functions, local stack |

### Edge Function dependencies (Deno `npm:` imports, not in package.json)

| Package | Purpose |
|---------|---------|
| `npm:openai` ^6.44.0 | AI generation (chat + images) |
| `npm:@supabase/supabase-js` ^2.108.2 | DB + Storage access in Edge Functions |
| `npm:zod` | Schema validation for structured outputs |

---

## New Environment Variables

### Next.js (`.env.local`)

| Variable | Scope | Purpose |
|----------|-------|---------|
| `STRIPE_SECRET_KEY` | Server only | Stripe API authentication |
| `STRIPE_WEBHOOK_SECRET` | Server only | Webhook signature verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client | Stripe.js loading |

### Supabase secrets (set via `supabase secrets set`)

| Variable | Scope | Purpose |
|----------|-------|---------|
| `OPENAI_API_KEY` | Edge Functions | OpenAI API authentication |
| `OPENAI_MODEL` | Edge Functions | Model selection (optional, defaults to `gpt-4o-mini`) |

All Next.js secrets stored in `.env.local` (gitignored). Server-only vars never prefixed with `NEXT_PUBLIC_`. Edge Function secrets set via CLI, never in `NEXT_PUBLIC_*`.

---

## OpenAI Model Selection

**Decision**: Use `gpt-4o` for text generation (angles, concepts, creatives, testing plan, buyer insights) and `gpt-image-1` for image generation.

**Rationale**: `gpt-4o` produces stronger reasoning, better creative writing, and more reliable instruction following for structured outputs. This directly improves the perceived intelligence of the strategy, angles, copy, and testing plan. `gpt-image-1` remains the best native image generation model for the ad creatives.

**Cost control**: `gpt-4o` is more expensive than `gpt-4o-mini`. For the $9 one-time purchase, the quality uplift is worth the incremental cost. To switch back, set `OPENAI_MODEL=gpt-4o-mini` via `supabase secrets set` — no code changes required.
