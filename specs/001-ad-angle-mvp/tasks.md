# Tasks: AngleCraft MVP — Ad Angle Generation & Testing Sprint

**Input**: Design documents from `/specs/001-ad-angle-mvp/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No test tasks generated — the spec does not request TDD and no test runner is configured (per constitution).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Next.js app**: `app/`, `components/`, `lib/` at repository root
- **Supabase CLI project**: `supabase/` at repository root (migrations, functions, config)
- **Edge Functions**: `supabase/functions/<name>/index.ts` (Deno runtime, `npm:` specifiers)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies, initialize Supabase CLI project, configure local stack.

- [ ] T001 Install Next.js dependencies via `pnpm add stripe @stripe/stripe-js zod cheerio @react-pdf/renderer`
- [ ] T002 Install Supabase CLI dev dependency via `pnpm add -D supabase`
- [ ] T003 Initialize Supabase CLI project with `pnpm exec supabase init` (creates `supabase/` directory with `config.toml`)
- [ ] T004 [P] Configure `supabase/config.toml` with storage buckets (`ad-creatives` private, `product-photos` private) and Edge Function settings (`verify_jwt = false` for all functions)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Create initial Supabase migration with `pnpm exec supabase migration new init` and write SQL schema in `supabase/migrations/<timestamp>_init.sql` (all tables: sessions, product_inputs, buyer_insights, ad_angles, ad_creatives, testing_plans, payments; all enums: session_status, input_type, payment_status, image_status; pgmq extension + `image_generation` queue creation; pg_cron schedule for `process-image-queue`; indexes)
- [ ] T006 Apply migration locally with `pnpm exec supabase db reset` (requires `pnpm exec supabase start` first — Docker must be running)
- [ ] T007 [P] Create shared TypeScript types and interfaces in `lib/types.ts` (Session, ProductInput, BuyerInsights, AdAngle, AdCreative, TestingPlan, Payment, enums, API request/response types)
- [ ] T008 [P] Create anonymous session management helpers in `lib/session.ts` (createSession, getSessionByToken, updateSessionStatus, checkSessionExpiry — uses Supabase server client, sets HTTP-only cookie with 7-day maxAge)
- [ ] T009 [P] Create Edge Function invocation helper in `lib/edge-functions.ts` (invokeEdgeFunction(name, payload) — calls `${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${name}` via fetch with anon key Authorization header, returns parsed JSON or throws)
- [ ] T010 [P] Create shared Zod schemas for OpenAI structured outputs in `supabase/functions/_shared/schemas.ts` (ProductContextSchema, BuyerInsightsSchema, AdAnglesSchema, AdConceptsSchema, AdCopySchema, TestingPlanSchema — imported by all Edge Functions via `npm:zod`)
- [ ] T011 [P] Create shared OpenAI client helper in `supabase/functions/_shared/openai-client.ts` (initializes `npm:openai` with `Deno.env.get("OPENAI_API_KEY")`, exports `generateStructured(schema, messages)` using `zodResponseFormat` and `.parse()`)
- [ ] T012 [P] Create shared Supabase client helper in `supabase/functions/_shared/supabase-client.ts` (initializes `npm:@supabase/supabase-js` with auto-injected `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — used only by `process-image-queue`)
- [ ] T013 [P] Add shadcn/ui components via `pnpm dlx shadcn@latest add progress separator tabs textarea` (adds to `components/ui/progress.tsx`, `components/ui/separator.tsx`, `components/ui/tabs.tsx`, `components/ui/textarea.tsx`)
- [ ] T014 Update `proxy.ts` to handle anonymous session cookie (`session_token`) — read cookie, do not interfere with existing Supabase auth refresh, keep matcher excluding static assets
- [ ] T015 [P] Set up Supabase Edge Function secrets file `supabase/.env` with `OPENAI_API_KEY` and `OPENAI_MODEL=gpt-4o-mini` (gitignored — copy from `.env.local`)

**Checkpoint**: Foundation ready — database schema applied, shared lib modules created, Edge Function shared code in place, UI primitives added. User story implementation can now begin.

---

## Phase 3: User Story 1 — Capture Product Input (Priority: P1) 🎯 MVP

**Goal**: User submits a product URL or photo, sees a 3-step status pipeline (Extracting → Analyzing → Generating ad angles), and arrives at a preview page showing Buyer Insights.

**Independent Test**: Submit a URL and a photo, confirm navigation to status page, watch three steps advance in order, arrive at preview showing Buyer Insights (buyer profile, main desire, pain points, buying triggers, objections).

### Implementation for User Story 1

- [ ] T016 [P] [US1] Create URL content extraction helper in `lib/extraction.ts` (fetch URL with browser User-Agent, 10s timeout, parse with cheerio: extract title, meta description, h1, price selectors, og:image, features — return structured text + image URL)
- [ ] T017 [P] [US1] Create Supabase Storage helpers in `lib/storage.ts` (uploadProductPhoto(sessionId, file) → uploads to `product-photos` bucket, returns storage path; getSignedImageUrl(bucket, path) → returns 1-hour signed URL)
- [ ] T018 [P] [US1] Create `analyze-product` Edge Function in `supabase/functions/analyze-product/index.ts` (AI-only: receives product text + optional image URL, calls OpenAI with ProductContextSchema then BuyerInsightsSchema, returns both — no DB writes)
- [ ] T019 [US1] Create `POST /api/extract` route handler in `app/api/extract/route.ts` (accepts FormData with `url` or `photo`; creates session row + sets `session_token` cookie; if photo: uploads to Storage via `lib/storage.ts`; if URL: extracts via `lib/extraction.ts`; inserts `product_inputs` row; updates session status to `extracting`; returns product info)
- [ ] T020 [US1] Create `POST /api/analyze` route handler in `app/api/analyze/route.ts` (reads session by cookie; invokes `analyze-product` Edge Function via `lib/edge-functions.ts` with extracted product text + image URL; writes `buyer_insights` row + updates `product_inputs.product_context`; updates session status to `analyzing` then `angles_generated`; returns Buyer Insights)
- [ ] T021 [P] [US1] Create `product-input.tsx` client component in `components/product-input.tsx` (URL input field + photo upload field with drag-and-drop, tab toggle between URL/photo modes, submits FormData to `/api/extract`, redirects to `/status` on success, shows validation errors)
- [ ] T022 [P] [US1] Create `status-pipeline.tsx` client component in `components/status-pipeline.tsx` (receives step definitions + current status as props; renders 3 steps with pending/in-progress/complete/failed states using shadcn Progress; polls session status via fetch; auto-navigates on completion; shows retry button on failure)
- [ ] T023 [P] [US1] Create `buyer-insights.tsx` client component in `components/buyer-insights.tsx` (receives BuyerInsights data as props; renders buyer profile, main desire, pain points array, buying triggers array, objections array in styled cards)
- [ ] T024 [US1] Create pre-payment status page in `app/(app)/status/page.tsx` (Server Component: reads session by cookie, fetches session status from DB, renders `status-pipeline.tsx` with 3 steps: "Extracting product information", "Analyzing product", "Generating ad angles")
- [ ] T025 [US1] Create preview page in `app/(app)/preview/page.tsx` (Server Component: reads session by cookie, fetches Buyer Insights from DB, renders `buyer-insights.tsx` — angles display added in US2)
- [ ] T026 [US1] Update `app/page.tsx` landing page to integrate `product-input.tsx` component (replace or augment existing static content with the input form section)

**Checkpoint**: User can submit a URL or photo, see the 3-step status pipeline advance, and arrive at a preview page showing Buyer Insights. Session persists across reloads.

---

## Phase 4: User Story 2 — Generate Ad Angles & Hooks (Priority: P1)

**Goal**: The system generates exactly five labeled ad angles (convenience, time saving, pain point, healthy lifestyle, perfect gift), each with one strong hook, and internally scores them to select the top three for paid creatives.

**Independent Test**: Submit a product, watch the pipeline complete, verify exactly five labeled ad angles appear on the preview page, each with one hook. Verify top three are marked as selected in the database.

### Implementation for User Story 2

- [ ] T027 [P] [US2] Create `generate-angles` Edge Function in `supabase/functions/generate-angles/index.ts` (AI-only: receives product context + buyer insights, calls OpenAI with AdAnglesSchema producing 5 angles with labels, hooks, scores; returns array — no DB writes)
- [ ] T028 [US2] Create `POST /api/angles` route handler in `app/api/angles/route.ts` (reads session by cookie; fetches product context + buyer insights from DB; invokes `generate-angles` Edge Function; inserts 5 `ad_angles` rows with hooks and scores; selects top 3 by score and marks `is_selected = true` (application logic); updates session status to `angles_generated`; returns angles array)
- [ ] T029 [P] [US2] Create `angle-preview.tsx` client component in `components/angle-preview.tsx` (receives 5 angles as props; renders each angle label + hook in a card; shows score badge; marks top 3 as "Selected for full campaign"; includes copy button per hook)
- [ ] T030 [US2] Update `app/(app)/preview/page.tsx` to fetch ad angles from DB and render `angle-preview.tsx` alongside `buyer-insights.tsx` (Server Component: reads angles by session_id, passes to client component)
- [ ] T031 [US2] Wire `/api/angles` into the status pipeline flow — update `app/(app)/status/page.tsx` and `status-pipeline.tsx` so the "Generating ad angles" step triggers `/api/angles` and navigates to `/preview` on completion

**Checkpoint**: Five ad angles with hooks are generated and displayed on the preview page. Top three are selected in the database. Full pre-payment flow works end-to-end.

---

## Phase 5: User Story 3 — Pay to Unlock Full Output (Priority: P1)

**Goal**: User clicks pay, completes Stripe checkout ($9), returns to a post-payment status flow with 3 steps (Generating concepts → Generating creatives → Building testing plan).

**Independent Test**: Reach the paywall, complete Stripe checkout in test mode (card 4242 4242 4242 4242), confirm post-payment status flow advances through its three steps.

### Implementation for User Story 3

- [ ] T032 [P] [US3] Create Stripe server client in `lib/stripe.ts` (initializes `stripe` with `STRIPE_SECRET_KEY`, exports `createCheckoutSession(sessionId, sessionToken)` — creates Checkout Session with `mode: 'payment'`, $9 line item, `success_url` and `cancel_url` with session token)
- [ ] T033 [US3] Create `POST /api/checkout` route handler in `app/api/checkout/route.ts` (reads session by cookie; checks for existing succeeded payment — returns 409 if already paid; creates Stripe Checkout Session via `lib/stripe.ts`; inserts `payments` row with status `pending`; returns `checkoutUrl`)
- [ ] T034 [US3] Create `POST /api/stripe-webhook` route handler in `app/api/stripe-webhook/route.ts` (`export const runtime = 'nodejs'`; reads raw body via `await request.text()`; verifies signature with `stripe.webhooks.constructEvent`; handles `checkout.session.completed` — updates `payments` status to `succeeded`, updates `sessions` status to `paid`; returns 200)
- [ ] T035 [P] [US3] Create `checkout-button.tsx` client component in `components/checkout-button.tsx` (calls `/api/checkout`, redirects to `checkoutUrl` via `window.location.href`; shows loading state; handles 409 already-paid by redirecting to results)
- [ ] T036 [US3] Create post-payment status page in `app/(app)/checkout/page.tsx` (Server Component: reads session by cookie, verifies payment succeeded, renders `status-pipeline.tsx` with 3 steps: "Generating concepts", "Generating creatives", "Building testing plan")
- [ ] T037 [US3] Update `app/(app)/preview/page.tsx` to render `checkout-button.tsx` when session status is `angles_generated` (paywall CTA: "Unlock Full Campaign — $9")
- [ ] T038 [US3] Handle Stripe checkout return — update `app/(app)/checkout/page.tsx` to read `session_token` from URL query param (set in `success_url`), reconcile payment status, and redirect to results page when all post-payment steps complete

**Checkpoint**: User can pay via Stripe, webhook confirms payment, post-payment status flow begins. Payment is recorded and duplicate charges are prevented.

---

## Phase 6: User Story 4 — Generate Ad Concepts & Creatives (Priority: P2)

**Goal**: System generates 3 ad concepts (one per selected angle), 3 ad creatives (image + headline + primary text + CTA), with copy-to-clipboard and PDF download.

**Independent Test**: Complete payment, verify exactly 3 ad creatives are produced, each tied to a selected angle, each with a generated image, headline, primary text, and CTA. Verify copy buttons and PDF download work.

### Implementation for User Story 4

- [ ] T039 [P] [US4] Create `generate-concepts` Edge Function in `supabase/functions/generate-concepts/index.ts` (AI-only: receives product context + buyer insights + 3 selected angles with hooks, calls OpenAI with AdConceptsSchema, returns 3 concepts — no DB writes)
- [ ] T040 [P] [US4] Create `generate-copy` Edge Function in `supabase/functions/generate-copy/index.ts` (AI-only: receives product context + buyer insights + 3 concepts, calls OpenAI with AdCopySchema, returns 3 creatives with headline/primaryText/cta — no DB writes)
- [ ] T041 [P] [US4] Create `process-image-queue` Edge Function in `supabase/functions/process-image-queue/index.ts` (cron-triggered, self-contained: reads up to 3 messages from `image_generation` queue via `pgmq_public.read` with vt=120s; for each: calls `openai.images.generate()` with `gpt-image-1`, uploads base64 to Supabase Storage `ad-creatives` bucket, updates `ad_creatives.image_storage_path` + `image_status='complete'`, deletes queue message; on failure: message auto-retries after vt, max 3 retries then archive + set `image_status='failed'`)
- [ ] T042 [P] [US4] Create Supabase Queue helpers in `lib/queue.ts` (enqueueImageJob(sessionId, angleId, concept, prompt) → calls `supabase.schema('pgmq_public').rpc('send', { queue_name: 'image_generation', message: {...} })`; readQueueMessages, deleteQueueMessage — used by route handlers to enqueue jobs)
- [ ] T043 [US4] Create `POST /api/concepts` route handler in `app/api/concepts/route.ts` (verifies paid session; fetches selected angles from DB; invokes `generate-concepts` Edge Function; inserts 3 `ad_creatives` rows with concept text and `image_status='pending'`; returns concepts)
- [ ] T044 [US4] Create `POST /api/creatives` route handler in `app/api/creatives/route.ts` (verifies paid session; fetches concepts from DB; invokes `generate-copy` Edge Function; updates `ad_creatives` rows with headline/primary_text/cta; constructs image prompts and enqueues 3 image generation jobs via `lib/queue.ts`; returns creatives with `imageStatus: 'pending'`)
- [ ] T045 [P] [US4] Create `copy-button.tsx` client component in `components/copy-button.tsx` (reusable: receives text prop, copies to clipboard via `navigator.clipboard.writeText`, shows "Copied!" feedback for 2s)
- [ ] T046 [P] [US4] Create `creative-card.tsx` client component in `components/creative-card.tsx` (receives creative data + signed image URL as props; renders ad image via `next/image`, headline, primary text, CTA; includes `copy-button.tsx` for each text field; shows image loading state while `image_status` is pending)
- [ ] T047 [P] [US4] Create PDF document component and generation helper in `lib/pdf.ts` (uses `@react-pdf/renderer`: `renderToBuffer(<CampaignPDF data={...} />)` — CampaignPDF renders Buyer Insights, 5 angles with hooks, 3 creatives with images, testing plan; returns PDF buffer)
- [ ] T048 [US4] Create `GET /api/download` route handler in `app/api/download/route.ts` (`export const runtime = 'nodejs'`; verifies paid session; fetches all artifacts from DB + signed image URLs from Storage; generates PDF via `lib/pdf.ts`; returns response with `Content-Type: application/pdf` and `Content-Disposition: attachment`)
- [ ] T049 [P] [US4] Create `download-pdf-button.tsx` client component in `components/download-pdf-button.tsx` (triggers `window.open('/api/download', '_blank')` or fetch + download; shows loading state during PDF generation)
- [ ] T050 [US4] Create results page in `app/(app)/results/page.tsx` (Server Component: verifies paid session; fetches creatives + angles + buyer insights + testing plan from DB; generates signed image URLs via `lib/storage.ts`; renders `creative-card.tsx` for each creative, `testing-plan-view.tsx` for plan, `download-pdf-button.tsx`)
- [ ] T051 [US4] Wire post-payment status pipeline — update `status-pipeline.tsx` and `app/(app)/checkout/page.tsx` so "Generating concepts" triggers `/api/concepts`, "Generating creatives" triggers `/api/creatives` then polls `image_status` until all 3 are complete, and "Building testing plan" triggers `/api/testing-plan` (US5); navigate to `/results` on completion

**Checkpoint**: Three ad creatives with images, copy, and CTA are generated and displayed. Copy-to-clipboard works. PDF download works. Image generation is async via queue.

---

## Phase 7: User Story 5 — Generate Testing Plan & Recommendations (Priority: P2)

**Goal**: System generates a structured testing plan for Meta and TikTok with budget allocation, audience guidance, testing duration, and key metrics, referencing all five angles with emphasis on the top three.

**Independent Test**: Complete payment and creatives, verify a structured testing plan is displayed covering budget, audience, duration, and metrics for Meta and TikTok, referencing all five angles.

### Implementation for User Story 5

- [ ] T052 [P] [US5] Create `generate-testing-plan` Edge Function in `supabase/functions/generate-testing-plan/index.ts` (AI-only: receives product context + buyer insights + 5 angles + 3 creatives, calls OpenAI with TestingPlanSchema, returns structured plan — no DB writes)
- [ ] T053 [US5] Create `POST /api/testing-plan` route handler in `app/api/testing-plan/route.ts` (verifies paid session; fetches angles + creatives + buyer insights from DB; invokes `generate-testing-plan` Edge Function; inserts `testing_plans` row; updates session status to `complete`; returns testing plan)
- [ ] T054 [P] [US5] Create `testing-plan-view.tsx` client component in `components/testing-plan-view.tsx` (receives testing plan JSON as props; renders platforms, budget allocation table, audience guidance, testing duration, key metrics list, per-angle guidance; includes `copy-button.tsx` for plan text)
- [ ] T055 [US5] Update `app/(app)/results/page.tsx` to fetch testing plan from DB and render `testing-plan-view.tsx` alongside creatives (Server Component: reads `testing_plans` by session_id, passes to client component)

**Checkpoint**: Testing plan is generated and displayed on the results page. Full post-payment flow works end-to-end: concepts → creatives → testing plan → results page.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, edge cases, and validation across all user stories.

- [ ] T056 [P] Add session expiry handling — update `lib/session.ts` `getSessionByToken` to check `expires_at` and return null if expired; update all route handlers to return 404 with "session expired" message when session is null
- [ ] T057 [P] Add invalid URL handling — update `app/api/extract/route.ts` to catch fetch errors (403, timeout, DNS failure) and return 422 with user-friendly message inviting photo upload instead
- [ ] T058 [P] Add generation failure + retry — update `status-pipeline.tsx` to show retry button on failed steps; retry calls the failed step's API endpoint again without losing prior progress; session status transitions to `failed` then back to the appropriate step on retry
- [ ] T059 [P] Add page reload resume — update `app/(app)/status/page.tsx` and `app/(app)/checkout/page.tsx` to read session status from DB on load and resume at the correct step (not restart from beginning)
- [ ] T060 [P] Add Stripe webhook reconciliation — update `app/(app)/checkout/page.tsx` to check payment status on load; if webhook is delayed, poll payments table and unlock once `succeeded`
- [ ] T061 Configure `next.config.ts` with `images.remotePatterns` for Supabase Storage domain (to allow `next/image` to display signed URLs from `{project}.supabase.co`)
- [ ] T062 [P] Add `.gitignore` entries for `supabase/.env` and verify `.env.local` is already gitignored
- [ ] T063 Run verification gates: `pnpm lint` (zero errors), `pnpm exec tsc --noEmit` (zero errors), `pnpm build` (succeeds)
- [ ] T064 Run Supabase verification: `pnpm exec supabase db reset` (migrations apply cleanly), `pnpm exec supabase functions serve` (Edge Functions start without errors)
- [ ] T065 Run quickstart.md validation scenarios 1-12 manually in `pnpm dev` + `supabase functions serve` + `stripe listen`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 (Phase 3) and US2 (Phase 4) are sequential — US2 builds on US1's preview page
  - US3 (Phase 5) depends on US2 (paywall appears on preview page with angles)
  - US4 (Phase 6) depends on US3 (requires paid session)
  - US5 (Phase 7) depends on US4 (results page shared, testing plan is final step)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational — no dependencies on other stories
- **User Story 2 (P1)**: Depends on US1 (preview page, Buyer Insights, product context in DB)
- **User Story 3 (P1)**: Depends on US2 (angles must be generated before paywall)
- **User Story 4 (P2)**: Depends on US3 (requires confirmed payment)
- **User Story 5 (P2)**: Depends on US4 (results page, creatives in DB for plan context)

### Within Each User Story

- Edge Functions (AI-only) can be built in parallel with route handlers (different files, no compile-time dependency)
- Client components can be built in parallel with each other (different files)
- Route handlers depend on lib modules from Foundational phase
- Pages depend on route handlers and client components being ready
- Integration tasks (wiring pages to APIs) come last within each story

### Parallel Opportunities

- **Phase 2 (Foundational)**: T007-T013 and T015 are all [P] — can run in parallel (different files)
- **Phase 3 (US1)**: T016-T018 (lib modules + Edge Function) are [P]; T021-T023 (client components) are [P]
- **Phase 4 (US2)**: T027 (Edge Function) and T029 (client component) are [P]
- **Phase 5 (US3)**: T032 (Stripe lib) and T035 (checkout button) are [P]
- **Phase 6 (US4)**: T039-T041 (Edge Functions) and T042 (queue lib) are [P]; T045-T047 and T049 (client components + PDF lib) are [P]
- **Phase 7 (US5)**: T052 (Edge Function) and T054 (client component) are [P]
- **Phase 8 (Polish)**: T056-T060 and T062 are [P]

---

## Parallel Example: User Story 1

```bash
# Launch all lib modules + Edge Function for User Story 1 together:
Task: "Create URL content extraction helper in lib/extraction.ts"
Task: "Create Supabase Storage helpers in lib/storage.ts"
Task: "Create analyze-product Edge Function in supabase/functions/analyze-product/index.ts"

# Launch all client components for User Story 1 together:
Task: "Create product-input.tsx client component in components/product-input.tsx"
Task: "Create status-pipeline.tsx client component in components/status-pipeline.tsx"
Task: "Create buyer-insights.tsx client component in components/buyer-insights.tsx"
```

## Parallel Example: User Story 4

```bash
# Launch all Edge Functions for User Story 4 together:
Task: "Create generate-concepts Edge Function in supabase/functions/generate-concepts/index.ts"
Task: "Create generate-copy Edge Function in supabase/functions/generate-copy/index.ts"
Task: "Create process-image-queue Edge Function in supabase/functions/process-image-queue/index.ts"

# Launch all client components + PDF lib for User Story 4 together:
Task: "Create copy-button.tsx client component in components/copy-button.tsx"
Task: "Create creative-card.tsx client component in components/creative-card.tsx"
Task: "Create PDF document component in lib/pdf.ts"
Task: "Create download-pdf-button.tsx client component in components/download-pdf-button.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (install deps, init Supabase)
2. Complete Phase 2: Foundational (migration, shared libs, Edge Function shared code)
3. Complete Phase 3: User Story 1 (input → status pipeline → Buyer Insights preview)
4. Complete Phase 4: User Story 2 (5 ad angles + hooks on preview page)
5. **STOP and VALIDATE**: Test the full pre-payment flow end-to-end
   - Submit URL → status pipeline → preview with angles + Buyer Insights
   - Submit photo → same flow
   - Reload page → session persists
   - Invalid URL → friendly error
6. Deploy/demo the free preview if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Free preview with Buyer Insights
3. Add User Story 2 → Test independently → Full free preview with 5 angles + hooks
4. Add User Story 3 → Test independently → Stripe payment works, post-payment flow begins
5. Add User Story 4 → Test independently → 3 creatives with images, copy, PDF download
6. Add User Story 5 → Test independently → Testing plan displayed on results page
7. Complete Polish phase → Error handling, edge cases, full quickstart validation
8. Final verification: all gates pass, all 12 quickstart scenarios pass
