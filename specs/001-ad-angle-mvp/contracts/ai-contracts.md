# AI Contracts: AngleCraft MVP

**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md) | [research.md](../research.md)

Defines the OpenAI structured output schemas (Zod) used for each generation
step. All AI generation runs in **Supabase Edge Functions** (Deno), not in
Next.js route handlers. Edge Functions use `npm:openai` and `npm:zod` via
Deno's `npm:` specifier. Shared Zod schemas live in
`supabase/functions/_shared/schemas.ts` and are imported by all Edge Functions.

Text generation uses `openai.beta.chat.completions.parse()` with
`zodResponseFormat()`. The model is `gpt-4o-mini` (configurable via
`OPENAI_MODEL` Supabase secret). Image generation uses `gpt-image-1` and is
processed asynchronously via Supabase Queue.

---

## Execution Architecture

```text
Next.js Route Handler
    ↓ fetch()
Supabase Edge Function (Deno, AI-only)
    ↓ npm:openai
OpenAI API (gpt-4o-mini for text, gpt-image-1 for images)
    ↓ returns structured results
Next.js Route Handler
    ↓ writes to Supabase DB (service-role key)
    ↓ enqueues to Supabase Queue (pgmq)

Exception: process-image-queue (cron-triggered, self-contained):
    → reads queue, calls OpenAI, uploads to Storage, writes DB, deletes message
```

**Edge Functions are AI-only**: they call OpenAI with structured outputs (Zod
schemas) and return the parsed results. They do **not** write to the database
or access Supabase Storage. All database writes, session updates, queue
enqueueing, and angle selection logic are handled by the Next.js route
handlers that invoke them.

The sole exception is `process-image-queue`, which is triggered by `pg_cron`
(not by a Next.js HTTP request) and therefore must handle its own queue reads,
Storage uploads, and database updates.

---

## 1. Product Context Analysis

**Edge Function**: `analyze-product`
**Purpose**: Analyze extracted product text + image into structured context.

**Input**: Extracted product text (name, description, price, features) and/or
product image URL (for vision analysis).

**Schema** (`ProductContextSchema` in `_shared/schemas.ts`):

```typescript
{
  name: string,
  category: string,
  description: string,
  keyBenefits: string[],      // 3-5 key benefits
  audienceSignals: string[],  // 3-5 audience characteristics
  priceRange: string,         // e.g., "budget", "mid-range", "premium"
}
```

**System prompt**: "You are a product analysis expert. Given product
information, extract structured product context for ad creative generation."

---

## 2. Buyer Insights

**Edge Function**: `analyze-product` (same function, second step)
**Purpose**: Generate buyer psychology profile from product context.

**Input**: Product context + extracted product text.

**Schema** (`BuyerInsightsSchema`):

```typescript
{
  buyerProfile: string,       // e.g., "Busy professionals"
  mainDesire: string,         // e.g., "Save time while staying healthy"
  painPoints: string[],       // 3-5 pain points
  buyingTriggers: string[],   // 3-5 triggers
  objections: string[],       // 2-3 objections
}
```

**System prompt**: "You are a consumer psychology expert. Given a
product, analyze the target buyer's psychology: who they are, what they want,
what pains them, what triggers purchases, and what objections they have."

---

## 3. Ad Angles + Hooks + Scoring

**Edge Function**: `generate-angles`
**Purpose**: Generate five ad angles, each with one strong hook, and score them
for top-3 selection.

**Input**: Product context + buyer insights.

**Schema** (`AdAnglesSchema`):

```typescript
{
  angles: [
    {
      angleLabel: string,     // must be one of the 5 fixed labels
      hook: string,           // single attention-grabbing line
      rationale: string,      // why this angle works for this product
      score: number,          // 1-100, AI-assigned
    }
  ]  // exactly 5 items
}
```

**Fixed angle labels**: `convenience`, `time_saving`, `pain_point`,
`healthy_lifestyle`, `perfect_gift`.

**Selection logic**: The Edge Function returns scores. The Next.js route handler selects the top three by score and marks them `is_selected = true` in the database (application logic, not AI).

**System prompt**: "You are an expert ad creative strategist. Generate
exactly five ad angles for this product, one for each of these categories:
convenience, time saving, pain point, healthy lifestyle, perfect gift. For
each angle, write one strong hook and score it from 1-100 based on likely
effectiveness for this product and audience."

---

## 4. Ad Concepts

**Edge Function**: `generate-concepts`
**Purpose**: Generate one concept per selected angle (3 total).

**Input**: Product context + buyer insights + selected angles with hooks.

**Schema** (`AdConceptsSchema`):

```typescript
{
  concepts: [
    {
      angleLabel: string,
      concept: string,        // creative concept description (2-3 sentences)
    }
  ]  // exactly 3 items, one per selected angle
}
```

**System prompt**: "You are an ad creative director. For each selected
ad angle, write one creative concept — a brief description of how the ad should
look and feel to bring this angle to life."

---

## 5. Ad Creatives (Copy)

**Edge Function**: `generate-copy`
**Purpose**: Generate headline, primary text, and CTA for each concept.

**Input**: Product context + concepts + buyer insights.

**Schema** (`AdCopySchema`):

```typescript
{
  creatives: [
    {
      angleLabel: string,
      headline: string,       // ad headline (max 40 chars)
      primaryText: string,    // body copy (max 200 chars)
      cta: string,            // call-to-action (max 20 chars)
    }
  ]  // exactly 3 items
}
```

**System prompt**: "You are a direct response copywriter. For each ad
concept, write a headline, primary text (body copy), and call-to-action
optimized for Meta and TikTok ad formats."

---

## 6. Ad Creative Images (via Queue)

**Edge Function**: `process-image-queue` (queue consumer)
**Purpose**: Generate one ad image per concept (3 total), asynchronously.

**Input**: Queue message containing `sessionId`, `angleId`, `concept`, `prompt`.

**API**: `openai.images.generate()` with `model: "gpt-image-1"`.

**Image prompt construction** (per creative, built by the Next.js route handler
when enqueuing):

```text
Create a social media ad image for {product name}.
Angle: {angle_label} — {concept}
Style: Clean, modern, eye-catching. Suitable for Meta/Instagram and TikTok feed.
Format: Square (1024x1024).
Do not include text overlays — the ad copy will be added separately.
```

**Output**: Base64-encoded PNG image. The Edge Function:
1. Converts base64 to bytes.
2. Uploads to Supabase Storage (`ad-creatives` bucket) at path `{sessionId}/{angleId}.png`.
3. Updates `ad_creatives.image_storage_path` and sets `image_status = 'complete'`.
4. Deletes the queue message.

**Note**: This is the only Edge Function that writes to the database and
Storage, because it is triggered by `pg_cron` rather than by a Next.js route
handler. All other Edge Functions are AI-only and return results to the
Next.js route handler, which performs the DB writes.

**Note**: Images are generated as separate queue jobs (one per creative) since
`gpt-image-1` supports `n=1` only. The queue processes them sequentially or in
small batches (up to 3 per invocation).

---

## 7. Testing Plan

**Edge Function**: `generate-testing-plan`
**Purpose**: Generate a structured testing plan for Meta and TikTok.

**Input**: Product context + buyer insights + five ad angles (with selected
flag) + three creatives.

**Schema** (`TestingPlanSchema`):

```typescript
{
  platforms: ["meta", "tiktok"],
  budgetAllocation: {
    meta: {
      totalBudget: string,        // e.g., "$150"
      perAngleBudget: string,     // e.g., "$50 per angle"
      duration: string,           // e.g., "7 days"
    },
    tiktok: {
      totalBudget: string,
      perAngleBudget: string,
      duration: string,
    }
  },
  audienceGuidance: {
    meta: string,                 // audience targeting recommendations
    tiktok: string,
  },
  testingDuration: {
    recommendedDays: number,      // e.g., 7
    reasoning: string,
  },
  keyMetrics: [
    {
      metric: string,             // e.g., "CTR", "CPC", "ROAS"
      target: string,             // e.g., "> 1.5%", "< $2", "> 2.0"
      why: string,
    }
  ],
  perAngleGuidance: [
    {
      angleLabel: string,
      priority: string,           // "high", "medium", "low"
      hypothesis: string,         // what we expect this angle to test
      recommendation: string,     // how to run this angle
    }
  ]  // 5 items (all angles), with emphasis on the 3 selected
}
```

**System prompt**: "You are a media buying expert specializing in Meta
(Facebook/Instagram) and TikTok ad testing. Create a structured testing plan
for these five ad angles. Focus on the three selected angles that have
ready-to-run creatives. Include budget allocation, audience guidance, testing
duration, and key metrics to watch. Make it understandable for someone with no
prior media-buying experience."

---

## Model Configuration

| Step | Edge Function | Model | Mode | Notes |
|------|--------------|-------|------|-------|
| Product context | `analyze-product` | gpt-4o-mini | Structured output | Text + optional image input (vision) |
| Buyer insights | `analyze-product` | gpt-4o-mini | Structured output | Text input |
| Ad angles + hooks + scoring | `generate-angles` | gpt-4o-mini | Structured output | Text input |
| Ad concepts | `generate-concepts` | gpt-4o-mini | Structured output | Text input |
| Ad copy | `generate-copy` | gpt-4o-mini | Structured output | Text input |
| Ad images | `process-image-queue` | gpt-image-1 | Image generation | Via queue, 3 sequential jobs |
| Testing plan | `generate-testing-plan` | gpt-4o-mini | Structured output | Text input |

**Fallback**: If `gpt-4o-mini` is unavailable or quality is insufficient,
set `OPENAI_MODEL=gpt-4o` via `supabase secrets set` — no code changes required.

**Error handling**: All AI calls in Edge Functions are wrapped in try/catch.
On failure, the Edge Function returns an error response to the Next.js route
handler, which sets the session status to `failed` and offers a retry. For
queue jobs (image generation), failed messages remain in the queue and are
retried automatically (max 3 retries with increasing visibility timeout, then
archived).

---

## Shared Schema File

All Zod schemas are defined in `supabase/functions/_shared/schemas.ts` and
imported by Edge Functions via relative import:

```typescript
// supabase/functions/_shared/schemas.ts
import { z } from "npm:zod";

export const ProductContextSchema = z.object({ ... });
export const BuyerInsightsSchema = z.object({ ... });
export const AdAnglesSchema = z.object({ ... });
export const AdConceptsSchema = z.object({ ... });
export const AdCopySchema = z.object({ ... });
export const TestingPlanSchema = z.object({ ... });
```

```typescript
// supabase/functions/generate-angles/index.ts
import { AdAnglesSchema } from "../_shared/schemas.ts";
import { zodResponseFormat } from "npm:openai/helpers/zod";
// ...
```
