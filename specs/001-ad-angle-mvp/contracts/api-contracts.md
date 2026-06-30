# API Contracts: AngleCraft MVP

**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md) | [data-model.md](../data-model.md)

All API routes are Next.js 16 App Router route handlers under `app/api/`.
Next.js route handlers are the orchestration layer — they handle session
management, Stripe, URL extraction, and PDF generation, and they delegate AI
generation to Supabase Edge Functions via `fetch`.

All routes accept and return JSON unless otherwise noted. All routes read
the `session_token` cookie to identify the anonymous session (except
`/api/extract` which creates the session on first call).

## Architecture Overview

```text
Browser → Next.js Route Handler ──→ Supabase Edge Function ──→ OpenAI
                 ↓                          (AI-only: call OpenAI,
          Supabase DB                       return results)
          Supabase Queue
          Supabase Storage              process-image-queue (cron-triggered):
                 ↑                          → reads queue, calls OpenAI,
                 └────────────────────      → uploads to Storage, writes DB
```

**Separation of concerns**:
- **Next.js route handlers**: session management, DB reads/writes, queue enqueue, Storage signed URLs, Stripe, URL extraction (cheerio), PDF generation, angle selection logic.
- **Supabase Edge Functions** (AI-only): call OpenAI with structured outputs, return results. No DB writes, no Storage access (except `process-image-queue`).
- **`process-image-queue`** (exception): cron-triggered, self-contained. Reads queue, calls OpenAI, uploads to Storage, writes DB, deletes queue message.

## Route Summary

| Route | Method | Auth | Purpose | Delegates To |
|-------|--------|------|---------|-------------|
| `/api/extract` | POST | None (creates session) | Extract product info from URL or photo | cheerio (local) |
| `/api/analyze` | POST | Session cookie | Analyze product → Buyer Insights | `analyze-product` Edge Function |
| `/api/angles` | POST | Session cookie | Generate 10 candidate angles, score, return top 5 priorities | `generate-angles` Edge Function |
| `/api/checkout` | POST | Session cookie | Create Stripe Checkout Session | Stripe API (local) |
| `/api/stripe-webhook` | POST | Stripe signature | Receive Stripe webhook, confirm payment | — (local) |
| `/api/concepts` | POST | Session cookie + paid | Generate 3 ad concepts | `generate-concepts` Edge Function |
| `/api/creatives` | POST | Session cookie + paid | Generate copy + enqueue image jobs | `generate-copy` Edge Function + pgmq |
| `/api/testing-plan` | POST | Session cookie + paid | Generate testing plan | `generate-testing-plan` Edge Function |
| `/api/download` | GET | Session cookie + paid | Generate and return PDF | — (local, @react-pdf/renderer) |

---

## POST /api/extract

Creates a session and extracts product information from a URL or uploaded photo.

**Request** (FormData):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | One of url/photo | Product URL (Amazon, Shopify, etc.) |
| `photo` | File | One of url/photo | Product image (JPG/PNG, max 10MB) |

**Response** (200):

```json
{
  "sessionId": "uuid",
  "status": "extracting",
  "product": {
    "name": "Portable Blender",
    "description": "...",
    "price": "$29.99",
    "features": ["USB rechargeable", "6 blades"],
    "imageUrl": "https://..."
  }
}
```

**Response** (400): `{ "error": "Invalid URL or image format" }`
**Response** (422): `{ "error": "Could not extract product info. Try uploading a photo instead." }`

**Side effects**: Creates `sessions` row, sets `session_token` cookie, creates `product_inputs` row. If photo: uploads to Supabase Storage (`product-photos` bucket).

---

## POST /api/analyze

Invokes the `analyze-product` Edge Function to generate product context and Buyer Insights.

**Request**: `{}` (session identified by cookie)

**Response** (200):

```json
{
  "status": "analyzing",
  "buyerInsights": {
    "buyerProfile": "Busy professionals",
    "mainDesire": "Save time while staying healthy",
    "painPoints": ["No time to prepare meals", "Expensive smoothies"],
    "buyingTriggers": ["Convenience", "Instant results"],
    "objections": ["I don't need another kitchen gadget"]
  }
}
```

**Response** (404): `{ "error": "Session not found or expired" }`

**Side effects**: Invokes `analyze-product` Edge Function (AI-only, returns results), then writes `buyer_insights` row and updates `product_inputs.product_context` in the database. Updates session status.

---

## POST /api/angles

Invokes the `generate-angles` Edge Function to produce ten candidate ad angles
with hooks, apply deterministic scoring and category boosts, and return the top
5 priorities.

**Request**: `{}` (session identified by cookie)

**Response** (200):

```json
{
  "status": "angles_generated",
  "angles": [
    {
      "id": "uuid",
      "angleLabel": "pain_point",
      "hook": "Tired of sweeping every day? Let the robot handle it.",
      "rationale": "Robot vacuums solve a clear, repetitive household chore.",
      "score": 9.3,
      "isSelected": true
    }
  ]
}
```

(All five top-priority angles returned; `score` and `isSelected` are set by the
Edge Function. `rationale` explains why the angle works for this product.)

**Response** (404): `{ "error": "Session not found or expired" }`
**Response** (409): `{ "error": "Angles already generated for this session" }`

**Side effects**: Invokes `generate-angles` Edge Function (AI-only, returns 10
candidates, scores them, and returns top 5), then writes five `ad_angles` rows
with scores. Selects top 3 by score and marks them `is_selected = true`
(application logic, not AI).

---

## POST /api/checkout

Creates a Stripe Checkout Session for the $9 one-time payment.

**Request**: `{}` (session identified by cookie)

**Response** (200):

```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/..."
}
```

**Response** (409): `{ "error": "Payment already completed for this session" }`

**Side effects**: Creates `payments` row with status `pending`.

---

## POST /api/stripe-webhook

Receives Stripe webhook events. Uses raw body for signature verification.

**Request**: Raw body (Stripe event JSON), `stripe-signature` header.

**Response** (200): `{ "received": true }`
**Response** (400): `{ "error": "Invalid signature" }`

**Side effects**: On `checkout.session.completed` — updates `payments` status to `succeeded`, updates `sessions` status to `paid`.

**Note**: `export const runtime = 'nodejs'` — must use Node.js runtime for crypto.

---

## POST /api/concepts

Invokes the `generate-concepts` Edge Function to generate one ad concept per selected angle (3 total).

**Request**: `{}` (session identified by cookie)

**Response** (200):

```json
{
  "status": "generating",
  "concepts": [
    {
      "creativeIndex": 1,
      "angleId": "uuid",
      "angleLabel": "convenience",
      "concept": "Photorealistic close-up of the blender in a gym bag...",
      "placement": "Meta Feed",
      "aspectRatio": "1:1",
      "imageText": "Smoothies On-The-Go"
    }
  ]
}
```

**Response** (402): `{ "error": "Payment required" }`

**Side effects**: Invokes `generate-concepts` Edge Function (AI-only, returns results), then creates three `ad_creatives` rows with concept text.

---

## POST /api/creatives

Invokes the `generate-copy` Edge Function for headlines/primary text/CTA, then enqueues 3 image generation jobs to the Supabase Queue.

**Request**: `{}` (session identified by cookie)

**Response** (200):

```json
{
  "status": "generating",
  "creatives": [
    {
      "id": "uuid",
      "creativeIndex": 1,
      "angleLabel": "convenience",
      "headline": "Your Gym Bag's New Best Friend",
      "primaryText": "Fresh smoothies anywhere...",
      "cta": "Get Yours Now",
      "imageStatus": "pending"
    }
  ]
}
```

**Response** (402): `{ "error": "Payment required" }`

**Side effects**:
1. Invokes `generate-copy` Edge Function (AI-only, returns results), then updates `ad_creatives` rows with headline, primary_text, cta.
2. Enqueues 3 messages to `image_generation` queue via `pgmq_public.send` (Next.js writes to queue, not the Edge Function).
3. The `process-image-queue` Edge Function (triggered by cron) consumes the queue asynchronously, generates images, uploads to Storage, and updates `ad_creatives.image_storage_path` + `image_status`.

**Polling**: The status page polls `/api/creatives/status` (or reads session status) until all 3 `image_status` fields are `complete`.

---

## POST /api/testing-plan

Invokes the `generate-testing-plan` Edge Function to generate the structured testing plan.

**Request**: `{}` (session identified by cookie)

**Response** (200):

```json
{
  "status": "complete",
  "testingPlan": {
    "campaignStrategy": {
      "recommendedWinner": 3,
      "creativePriorities": [3, 2, 1],
      "primaryPlatform": "Meta Ads",
      "primaryPlacement": "Meta Feed",
      "testingDurationDays": 3,
      "evaluationMetrics": ["Purchases", "Cost Per Purchase", "CTR", "CPC"],
      "phaseOrder": [3, 2, 1]
    },
    "customerInsights": {
      "targetBuyer": "Parents of children aged 4-10",
      "mainPain": "Too much screen time",
      "mainDesire": "Educational entertainment",
      "mainBuyingTrigger": "Family bonding",
      "mainObjection": "Will my child actually use it?",
      "mostImportantBuyerEmotion": "Parents want to feel they are making the best developmental choice for their children."
    },
    "recommendedFirstTest": {
      "creativeIndex": 3,
      "creativeName": "Pain Point",
      "why": "Parents respond strongly to solving a real frustration.",
      "expectedOutcome": "Strong purchase intent from parents who recognize the problem.",
      "selectionRationale": [
        "Strongest purchase intent",
        "Broadest audience appeal"
      ],
      "runOn": "Meta Ads — Meta Feed + Instagram Feed"
    },
    "creativeStrategies": [
      {
        "creativeIndex": 3,
        "angleLabel": "pain_point",
        "angleCategory": "Pain Point",
        "psychology": "Relief from screen-time guilt",
        "primaryPlacement": "Meta Feed",
        "secondaryPlacement": "Instagram Feed",
        "testingPriority": 1,
        "bestUseCase": "Broad testing",
        "reasonToTest": "Validates the strongest angle first."
      }
    ],
    "testingIntensity": {
      "minimum": "$20/day",
      "recommended": "$50/day",
      "fast": "$100/day",
      "explanation": "Testing budgets are based on common e-commerce creative testing practices and should be adjusted to your market, product pricing, and business goals."
    },
    "testingPlan": {
      "phase1": {
        "create": ["Create one Meta Sales campaign", "Create one broad ad set"],
        "upload": "Creative #3",
        "run": "3 days",
        "evaluate": ["Purchases", "Cost Per Purchase", "CTR", "CPC"],
        "decision": "If Creative #3 generates purchases at an acceptable cost, increase budget gradually. If it generates clicks but no purchases, test the next creative. If it performs poorly, pause and move to the next creative."
      },
      "phase2": {
        "pause": "Creative #3",
        "upload": "Creative #2",
        "run": "3 days",
        "evaluate": "Review purchases, cost per purchase, CTR, and CPC."
      },
      "phase3": {
        "condition": "If Phase 2 does not win",
        "upload": "Creative #1",
        "run": "3 days"
      }
    },
    "whyNotOthers": [
      {
        "creativeIndex": 2,
        "reason": "Recommended later in the testing sprint based on priority."
      }
    ],
    "whyWinner": [
      "Strongest purchase intent",
      "Broadest audience appeal",
      "Strong emotional trigger",
      "Best visual storytelling opportunity"
    ],
    "workflow": {
      "day1": "Launch Creative #3.",
      "day4": "Review purchases, cost per purchase, CTR, and CPC.",
      "ifWinner": "Increase budget gradually.",
      "ifLoser": "Return to this playbook and launch Creative #2.",
      "ifNone": "Pause all and revisit the angles before retesting."
    },
    "disclaimer": "This playbook is a starting framework and results depend on the product, market, and execution."
  }
}
```

**Response** (402): `{ "error": "Payment required" }`

**Side effects**: Invokes `generate-testing-plan` Edge Function (AI-only, returns results), then creates `testing_plans` row and updates session status to `complete`. Existing plans are returned idempotently only if they have the new shape (`whyWinner`, `campaignType`, `audienceStrategy`, `optimizationGoal`); otherwise they are deleted and regenerated.

---

## GET /api/download

Generates and returns a PDF containing all artifacts. Fetches images from Supabase Storage via signed URLs.

**Request**: Session cookie.

**Response** (200): `Content-Type: application/pdf`, binary PDF body.

**Response** (402): `{ "error": "Payment required" }`
**Response** (404): `{ "error": "Session not found or expired" }`

**Note**: `export const runtime = 'nodejs'`. Uses `@react-pdf/renderer`.

---

## Supabase Edge Function Contracts

Edge Functions are called by Next.js route handlers via `fetch`. They are not
called directly by the browser. Edge Functions are **AI-only** — they call
OpenAI and return structured results. They do **not** write to the database or
access Supabase Storage. All database writes, session updates, and queue
operations are handled by the Next.js route handlers that invoke them.

The sole exception is `process-image-queue`, which is triggered by `pg_cron`
(not by an HTTP request from Next.js) and therefore must handle its own queue
reads, Storage uploads, and database updates.

### `analyze-product`

**URL**: `{SUPABASE_URL}/functions/v1/analyze-product`
**Method**: POST
**Auth**: `Authorization: Bearer {SUPABASE_ANON_KEY}`
**verify_jwt**: `false` (in config.toml)

**Request**:
```json
{
  "productName": "...",
  "productDescription": "...",
  "productFeatures": ["..."],
  "productPrice": "$29.99",
  "imageUrl": "https://..."
}
```

**Response**:
```json
{
  "productContext": { "name": "...", "category": "...", "keyBenefits": [...], "audienceSignals": [...] },
  "buyerInsights": { "buyerProfile": "...", "mainDesire": "...", "painPoints": [...], "buyingTriggers": [...], "objections": [...] }
}
```

**Side effects**: None. The Next.js route handler writes `buyer_insights` and updates `product_inputs.product_context` after receiving the response.

---

### `generate-angles`

**URL**: `{SUPABASE_URL}/functions/v1/generate-angles`
**Method**: POST
**verify_jwt**: `false`

**Request**:
```json
{
  "productContext": { ... },
  "buyerInsights": { ... }
}
```

**Response**:
```json
{
  "angles": [
    {
      "angleLabel": "pain_point",
      "hook": "...",
      "rationale": "...",
      "criteria": {
        "purchaseIntent": 10,
        "audienceReach": 9,
        "creativePotential": 9,
        "emotionalStrength": 8
      },
      "score": 9.3
    }
  ]
}
```

**Side effects**: None. The AI returns labels, hooks, and rationale for the 10
candidate angles only. Base scores, product-category boosts, and top-5 selection
are applied deterministically in code. The Next.js route handler writes five
`ad_angles` rows (the top 5 priorities) and marks the top 3 by score as
`is_selected` after receiving the response.

---

### `generate-concepts`

**URL**: `{SUPABASE_URL}/functions/v1/generate-concepts`
**Method**: POST
**verify_jwt**: `false`

**Request**:
```json
{
  "productContext": { ... },
  "buyerInsights": { ... },
  "selectedAngles": [ { "angleLabel": "...", "hook": "...", "score": 92 } ]
}
```

**Response**:
```json
{
  "concepts": [
    {
      "angleLabel": "...",
      "concept": "...",
      "visualStyle": "photorealistic lifestyle shot",
      "placement": "Meta Feed",
      "aspectRatio": "1:1",
      "imageText": "Optional overlay"
    }
  ]
}
```

**Side effects**: None. The Next.js route handler creates three `ad_creatives` rows with concept text after receiving the response.

---

### `generate-copy`

**URL**: `{SUPABASE_URL}/functions/v1/generate-copy`
**Method**: POST
**verify_jwt**: `false`

**Request**:
```json
{
  "productContext": { ... },
  "buyerInsights": { ... },
  "concepts": [ { "angleLabel": "...", "concept": "..." } ]
}
```

**Response**:
```json
{
  "creatives": [
    { "angleLabel": "...", "headline": "...", "primaryText": "...", "cta": "..." }
  ]
}
```

**Side effects**: None. The Next.js route handler updates `ad_creatives` rows with headline, primary_text, cta after receiving the response.

---

### `generate-testing-plan`

**URL**: `{SUPABASE_URL}/functions/v1/generate-testing-plan`
**Method**: POST
**verify_jwt**: `false`

**Request**:
```json
{
  "productContext": { ... },
  "buyerInsights": { ... },
  "angles": [ ... ],
  "creatives": [
    {
      "index": 1,
      "angleLabel": "...",
      "headline": "...",
      "primaryText": "...",
      "cta": "...",
      "concept": "..."
    }
  ]
}
```

**Response**:
```json
{
  "testingPlan": { "platforms": [...], "budgetAllocation": {...}, ... }
}
```

**Side effects**: None. The Next.js route handler creates the `testing_plans` row and updates session status to `complete` after receiving the response.

---

### `process-image-queue` (exception — cron-triggered, self-contained)

**URL**: `{SUPABASE_URL}/functions/v1/process-image-queue`
**Method**: POST
**verify_jwt**: `false`
**Trigger**: `pg_cron` every 30 seconds

**Request**: Empty body (triggered by cron).

**Behavior**:
1. Reads up to 3 messages from `image_generation` queue (`pgmq_public.read`, vt=120s).
2. For each message:
   a. Calls `openai.images.generate()` with `model: "gpt-image-1"`.
   b. Uploads base64 image to Supabase Storage (`ad-creatives` bucket).
   c. Updates `ad_creatives.image_storage_path` and `image_status = 'complete'`.
   d. Deletes queue message.
3. On failure: message remains invisible for vt seconds, retried automatically. After 3 failures, archive and set `image_status = 'failed'`.

**Response**:
```json
{ "processed": 3, "succeeded": 2, "failed": 1 }
```

**Note**: This is the only Edge Function that writes to the database and Storage, because it is triggered by `pg_cron` rather than by a Next.js route handler. There is no HTTP request from Next.js to handle the non-AI work.

---

## Error Response Format

All error responses follow this shape:

```json
{
  "error": "Human-readable error message",
  "code": "OPTIONAL_ERROR_CODE"
}
```

HTTP status codes used:
- `400` — Bad request (invalid input, missing fields)
- `402` — Payment required (attempting paid endpoint without payment)
- `404` — Session not found or expired
- `409` — Conflict (duplicate operation, e.g., angles already generated)
- `422` — Unprocessable (extraction failed, AI generation failed)
- `500` — Internal server error
