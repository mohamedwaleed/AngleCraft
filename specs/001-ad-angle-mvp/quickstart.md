# Quickstart: AngleCraft MVP

**Feature**: [spec.md](./spec.md) | [plan.md](./plan.md) | [data-model.md](./data-model.md)

This guide describes how to validate the AngleCraft MVP feature end-to-end.
It covers prerequisites, setup, and runnable validation scenarios with
expected outcomes. Implementation details are in `tasks.md`.

## Prerequisites

### Environment

- Node.js 18+ (required by Next.js 16)
- `pnpm` package manager
- Docker (required for local Supabase stack)
- Supabase CLI (`pnpm add -D supabase` or `brew install supabase/tap/supabase`)
- An OpenAI API key
- A Stripe account (test mode for development)

### Environment Variables

#### Next.js (`.env.local`)

```text
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>
```

#### Supabase Edge Functions secrets (`supabase/.env`)

```text
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_MODEL=gpt-4o
```

Set production secrets via: `supabase secrets set --env-file ./supabase/.env`

**Note**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
are auto-injected by the Supabase platform into Edge Functions — do not set
them manually.

## Setup Commands

### 1. Install Dependencies

```bash
# Next.js dependencies
pnpm install

# Supabase CLI (if not installed globally)
pnpm add -D supabase
```

### 2. Initialize Supabase (first time only)

```bash
# Initialize Supabase project structure (creates supabase/ directory)
pnpm exec supabase init

# Start local Supabase stack (requires Docker)
pnpm exec supabase start
```

The `supabase start` command outputs local URLs and keys:
- Project URL: `http://127.0.0.1:54321`
- Anon Key: `eyJ...`
- Service Role Key: `eyJ...`

Use these in `.env.local` for local development.

### 3. Run Database Migrations

```bash
# Create the initial migration (if not already created)
pnpm exec supabase migration new init

# Apply migrations locally
pnpm exec supabase migration up

# Or reset the local database completely (applies all migrations from scratch)
pnpm exec supabase db reset
```

This creates all tables (`sessions`, `product_inputs`, `buyer_insights`,
`ad_angles`, `ad_creatives`, `testing_plans`, `payments`), enums, the
`image_generation` queue, and the `pg_cron` schedule for the queue processor.

### 4. Configure Storage Buckets

Buckets are defined in `supabase/config.toml`:
- `ad-creatives` (private) — generated ad images
- `product-photos` (private) — uploaded product photos

After `supabase start`, buckets are created automatically from config.toml.
Verify in the local Supabase Dashboard at `http://127.0.0.1:54323`.

### 5. Set Edge Function Secrets

```bash
# Set local secrets for Edge Functions
pnpm exec supabase secrets set --env-file ./supabase/.env
```

### 6. Serve Edge Functions Locally

```bash
# Start Edge Functions local server
pnpm exec supabase functions serve --env-file ./supabase/.env --no-verify-jwt
```

Edge Functions are available at `http://127.0.0.1:54321/functions/v1/<name>`.

### 7. Start Next.js Dev Server

```bash
pnpm dev
```

### 8. Stripe Webhook (Local Development)

```bash
# Install Stripe CLI (if not already installed)
brew install stripe/stripe-cli/stripe

# Forward webhooks to local dev server
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

Copy the `whsec_...` webhook signing secret from the CLI output into
`STRIPE_WEBHOOK_SECRET` in `.env.local`.

## Verification Gates

Before considering any work complete, all gates MUST pass:

```bash
# Next.js gates
pnpm lint                    # zero lint errors
pnpm exec tsc --noEmit       # zero type errors
pnpm build                   # succeeds

# Supabase gates
pnpm exec supabase db reset  # migrations apply cleanly
pnpm exec supabase functions serve  # Edge Functions start without errors

# Then manually exercise in pnpm dev + supabase functions serve
```

## Validation Scenarios

### Scenario 1: URL Input → Free Preview

**Validates**: US-1 (input capture + status pipeline), US-2 (angle/hook generation), Buyer Insights.

**Steps**:
1. Start both `pnpm dev` and `pnpm exec supabase functions serve`.
2. Open `http://localhost:3000` in a browser.
3. Paste a valid Amazon or Shopify product URL into the input field.
4. Click submit.
5. Observe navigation to the status page.
6. Watch the three steps advance: "Extracting product information" → "Analyzing product" → "Generating ad angles".
7. Observe navigation to the preview page.

**Expected outcomes**:
- Status page shows three steps with pending/in-progress/complete states.
- Preview page shows exactly five ad angles, each with one hook.
- Preview page shows a Buyer Insights section with buyer profile, main desire, pain points, buying triggers, and objections.
- A `session_token` cookie is set in the browser.
- The `sessions` table has a row with status `angles_generated`.
- Edge Function logs show `analyze-product` and `generate-angles` invocations.

### Scenario 2: Photo Input → Free Preview

**Validates**: US-1 (photo upload path).

**Steps**:
1. Open `http://localhost:3000` in a fresh browser (no cookie).
2. Upload a clear product photo (JPG or PNG).
3. Click submit.
4. Watch the status pipeline advance.
5. Observe the preview page.

**Expected outcomes**:
- Same as Scenario 1, but product context is derived from the image.
- `product_inputs.input_type` is `photo`.
- Photo is stored in Supabase Storage (`product-photos` bucket).
- `product_inputs.image_storage_path` is set.

### Scenario 3: Session Persistence (Reload)

**Validates**: FR-005 (session retention across reloads).

**Steps**:
1. Complete Scenario 1 or 2 (reach the preview page).
2. Reload the page.

**Expected outcomes**:
- The preview page reloads with the same angles, hooks, and Buyer Insights.
- No re-input required.
- Session token cookie is still present.

### Scenario 4: Payment → Full Campaign

**Validates**: US-3 (Stripe payment), US-4 (concepts + creatives), US-5 (testing plan).

**Steps**:
1. Complete Scenario 1 (reach the preview page).
2. Click the "Unlock Full Campaign — $9" button.
3. Complete Stripe Checkout in test mode (use test card `4242 4242 4242 4242`).
4. Observe redirect back to the app.
5. Watch the post-payment status flow: "Generating concepts" → "Generating creatives" → "Building testing plan".
6. Observe the results page.

**Expected outcomes**:
- Stripe Checkout opens with a $9.00 USD charge.
- Post-payment status page shows three steps advancing.
- Edge Function logs show `generate-concepts`, `generate-copy`, and `generate-testing-plan` invocations.
- Results page shows exactly three ad creatives, each with:
  - A generated ad image (loaded from Supabase Storage via signed URL)
  - A headline
  - Primary text
  - A call-to-action
- Each creative is tied to one of the top three selected ad angles.
- Results page shows a testing plan with budget allocation, audience guidance, duration, and metrics for Meta Ads.
- `payments` table has a row with status `succeeded`.
- `sessions` table status is `complete`.
- `ad_creatives` rows have `image_status = 'complete'` and `image_storage_path` set.
- Images are stored in Supabase Storage (`ad-creatives` bucket).

### Scenario 5: Image Generation via Queue

**Validates**: Supabase Queue + `process-image-queue` Edge Function.

**Steps**:
1. Complete Scenario 4 up to the "Generating creatives" step.
2. Monitor the Supabase Dashboard → Queues section.
3. Observe messages appearing in the `image_generation` queue.
4. Observe the `process-image-queue` Edge Function consuming messages (triggered by `pg_cron`).

**Expected outcomes**:
- Three messages are enqueued to `image_generation` queue.
- The `process-image-queue` Edge Function reads and processes messages.
- Each processed message results in:
  - An OpenAI `gpt-image-1` API call.
  - An upload to Supabase Storage (`ad-creatives` bucket).
  - An update to `ad_creatives.image_storage_path` and `image_status = 'complete'`.
  - Deletion of the queue message.
- The status page polls and advances as images complete.

### Scenario 6: Copy Individual Artifacts

**Validates**: FR-016 (copy to clipboard).

**Steps**:
1. On the results page (Scenario 4), click the copy button next to a headline.
2. Paste into a text editor.
3. Repeat for primary text, CTA, and the testing plan.

**Expected outcomes**:
- Each copy button copies the corresponding text to the clipboard.
- Pasted content matches what was displayed.

### Scenario 7: PDF Download

**Validates**: FR-016a (PDF download).

**Steps**:
1. On the results page (Scenario 4), click "Download PDF".
2. Open the downloaded file.

**Expected outcomes**:
- A PDF file downloads (`anglecraft-campaign.pdf`).
- PDF contains: Buyer Insights, all five angles with hooks, the three selected concepts with creatives (including images from Storage), and the testing plan.

### Scenario 8: Duplicate Payment Prevention

**Validates**: FR-012 (no duplicate charges).

**Steps**:
1. Complete Scenario 4 (session is paid).
2. Attempt to navigate to checkout again.

**Expected outcomes**:
- The system detects the existing successful payment and does not create a new Checkout Session.
- The user is shown the results page directly.

### Scenario 9: Session Expiry

**Validates**: FR-005 (7-day TTL), edge case for expired sessions.

**Steps**:
1. Manually set a session's `expires_at` to a past timestamp in Supabase.
2. Reload the app with that session's cookie.

**Expected outcomes**:
- The system shows a "session expired" message.
- The user is invited to start a new session.

### Scenario 10: Generation Failure + Retry

**Validates**: FR-005d, FR-011d (retry from failed step).

**Steps**:
1. Temporarily set an invalid `OPENAI_API_KEY` via `supabase secrets set`.
2. Restart Edge Functions: `pnpm exec supabase functions serve`.
3. Submit a URL and watch the status pipeline.
4. Observe a step failing.
5. Restore the valid `OPENAI_API_KEY`.
6. Click "Retry" on the failed step.

**Expected outcomes**:
- The failing step is marked as "failed" with an error message.
- Retry re-attempts from the failed step without losing prior progress.
- After retry with valid key, the pipeline completes.

### Scenario 11: Image Generation Failure + Queue Retry

**Validates**: Queue retry logic for image generation.

**Steps**:
1. Temporarily set an invalid `OPENAI_API_KEY`.
2. Complete payment and reach the "Generating creatives" step.
3. Observe image generation jobs failing in the queue.
4. Restore the valid `OPENAI_API_KEY`.
5. Wait for the visibility timeout to expire (or manually re-queue).

**Expected outcomes**:
- Failed image jobs remain in the queue (invisible during visibility timeout).
- After timeout, jobs become visible and are retried by the next `process-image-queue` invocation.
- After 3 failures, jobs are archived and `image_status` is set to `failed`.
- User can retry from the failed step.

### Scenario 12: Invalid URL Handling

**Validates**: FR-020 (error messages), edge case for non-product URLs.

**Steps**:
1. Submit a non-product URL (e.g., `https://example.com`).
2. Submit an unreachable URL (e.g., `https://this-domain-does-not-exist.com`).

**Expected outcomes**:
- The system shows a user-friendly error explaining the URL could not be read.
- The user is invited to retry or upload a photo instead.

## Manual Testing Checklist

After running the validation scenarios above, verify:

- [ ] Landing page input form accepts both URL and photo.
- [ ] Status page shows real-time step progression.
- [ ] Preview page shows 5 angles, 5 hooks, and Buyer Insights.
- [ ] Edge Functions are invoked correctly (check logs).
- [ ] Stripe checkout works in test mode.
- [ ] Post-payment status page shows 3 steps.
- [ ] Image generation jobs are enqueued to Supabase Queue.
- [ ] `process-image-queue` Edge Function consumes queue and generates images.
- [ ] Generated images are stored in Supabase Storage.
- [ ] Results page shows 3 creatives with images (from Storage signed URLs).
- [ ] Results page shows testing plan for Meta Ads.
- [ ] Copy buttons work for all text artifacts.
- [ ] PDF download includes all artifacts.
- [ ] Session persists across page reloads.
- [ ] Expired sessions show expiry message.
- [ ] Failed steps offer retry without data loss.
- [ ] Queue jobs retry automatically on failure.
- [ ] No duplicate charges for the same session.
- [ ] `pnpm lint` passes.
- [ ] `pnpm exec tsc --noEmit` passes.
- [ ] `pnpm build` succeeds.
- [ ] `pnpm exec supabase db reset` applies migrations cleanly.
- [ ] `pnpm exec supabase functions serve` starts without errors.
