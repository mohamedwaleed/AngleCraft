# AI Contracts: AngleCraft MVP

**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md) | [research.md](../research.md)

Defines the OpenAI structured output schemas (Zod) used for each generation
step. All AI generation runs in **Supabase Edge Functions** (Deno), not in
Next.js route handlers. Edge Functions use `npm:openai` and `npm:zod` via
Deno's `npm:` specifier. Shared Zod schemas live in
`supabase/functions/_shared/schemas.ts` and are imported by all Edge Functions.

Text generation uses `openai.beta.chat.completions.parse()` with
`zodResponseFormat()`. The model is `gpt-4o` (configurable via
`OPENAI_MODEL` Supabase secret). Image generation uses `gpt-image-1` and is
processed asynchronously via Supabase Queue.

---

## Execution Architecture

```text
Next.js Route Handler
    ↓ fetch()
Supabase Edge Function (Deno, AI-only)
    ↓ npm:openai
OpenAI API (gpt-4o for text, gpt-image-1 for images)
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

## 3. Ad Angles + Hooks (Deterministic Scoring)

**Edge Function**: `generate-angles`
**Purpose**: Generate a fixed candidate pool of ten ad angles, each with one
strong hook and rationale. The AI writes hooks and rationales for all ten
labels — **it never scores, ranks, or selects angles**. Scoring, ranking, and
top-5 selection are applied deterministically in code.

**Input**: Product context + buyer insights.

**Schema** (`AdAnglesSchema`):

```typescript
{
  angles: [
    {
      angleLabel: string,     // one of 10 candidate taxonomy values
      hook: string,           // single attention-grabbing line
      rationale: string,      // why this angle works for this product
    }
  ]  // exactly 10 items (candidate pool)
}
```

**Angle taxonomy (10 candidate labels)**: `pain_point`, `convenience`,
`time_saving`, `gift`, `lifestyle`, `emotional`, `educational`, `aspiration`,
`transformation`, `social_proof`.

**Deterministic scoring** (in code, not AI): Base scores per taxonomy angle live
in `BASE_SCORES` in `supabase/functions/generate-angles/index.ts` across four
criteria (1-10 scale): `purchaseIntent`, `audienceReach`, `creativePotential`,
`emotionalStrength`. The final score is
`purchaseIntent*0.40 + audienceReach*0.25 + creativePotential*0.20 + emotionalStrength*0.15`.
Product-category boosts from `CATEGORY_BOOSTS` are applied deterministically,
then the top 5 angles become Priority #1–#5. The same product always produces
the same ranking.

**Selection logic**: The Edge Function generates the ten candidates, applies
base scores and category boosts, sorts by score, and returns the top 5. The
Next.js route handler writes these five rows to `ad_angles` and marks the top 3
by score as `is_selected = true` for the paid creative generation pipeline.

**System prompt**: "You are an expert ad creative strategist. Generate exactly
ten ad angles using ONLY these labels and in this exact order: pain_point,
convenience, time_saving, gift, lifestyle, emotional, educational, aspiration,
transformation, social_proof. Do not add, remove, rename, replace, reorder,
score, rank, or rate the angles. For each angle, write one strong hook and a
brief rationale. Do NOT include scores, rankings, priorities, alternative
angle labels, or additional angles — selection and scoring are handled
separately."

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
      creativeIndex: number,  // 1, 2, or 3 — stable order of the selected angles
      angleLabel: string,
      concept: string,        // vivid visual description of the ad image
      visualStyle: string,    // e.g. "photorealistic lifestyle shot"
      placement: string,      // "Meta Feed" or "Instagram Feed"
      aspectRatio: "1:1" | "4:5",
      imageText?: string,     // optional 3-5 word overlay
    }
  ]  // exactly 3 items, one per selected angle
}
```

**System prompt**: "You are an expert ad creative strategist and performance marketer. Given a product, buyer insights, and three selected ad angles, generate exactly one photorealistic, platform-native creative concept per angle. Each concept must describe an ad image that could be uploaded directly to Meta Ads Manager — not an abstract poster. Include a visual style, placement (Meta Feed or Instagram Feed), aspect ratio (1:1 or 4:5), and an optional short text overlay."

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
      creativeIndex: number,  // 1, 2, or 3 — must match the concept order
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
optimized for Meta Ads formats."

---

## 6. Ad Creative Images (via Queue)

**Edge Function**: `process-image-queue` (queue consumer)
**Purpose**: Generate one ad image per concept (3 total), asynchronously.

**Input**: Queue message containing `sessionId`, `angleId`, `concept`, `prompt`.

**API**: `openai.images.generate()` with `model: "gpt-image-1"`.

**Image prompt construction** (per creative, built by the Next.js route handler
when enqueuing):

```text
Create a photorealistic, native-looking {Meta Feed / Instagram Feed static ad} for this concept: {visualStyle}: {concept}.
Style: professional product photography or authentic lifestyle content, natural lighting, real-world context, not an illustration or poster.
The image must look like a real, scroll-stopping photo a media buyer would upload to Meta Ads Manager.
If imageText is provided: Include this exact text overlay, large and readable: "{imageText}".
Otherwise: Do not include any text, logos, or captions in the image. The ad copy will be added separately.
Avoid abstract backgrounds and Pinterest-style aesthetics. Show the product or benefit in a believable real-life moment.
Format: {aspect ratio}.
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
**Purpose**: Generate a unified Meta Ads testing playbook. Meta Ads only — no
TikTok. A master `campaignStrategy` object is built deterministically in code
(winner, priority order, platform, placement, metrics) and every section is
derived from it. Deterministic fields (`campaignType`, `audienceStrategy`,
`optimizationGoal`, `whyWinner`, testing budgets, phase decisions) are
force-overwritten in code after the AI returns.

**Input**: Product context + buyer insights + five ad angles (with selected
flag) + three creatives.

**Schema** (`TestingPlanSchema`):

```typescript
{
  campaignStrategy: {
    recommendedWinner: number,     // 1-3, set by deterministic scoring
    creativePriorities: number[],  // [winner, second, third]
    primaryPlatform: string,       // "Meta Ads"
    primaryPlacement: string,      // "Meta Feed"
    testingDurationDays: number,   // 3
    evaluationMetrics: string[],   // ["Purchases", "Cost Per Purchase", "CTR", "CPC"]
    phaseOrder: number[],
  },
  customerInsights: {
    targetBuyer: string,
    mainPain: string,
    mainDesire: string,
    mainBuyingTrigger: string,
    mainObjection: string,
    mostImportantBuyerEmotion: string,
  },
  recommendedFirstTest: {
    creativeIndex: number,         // 1-3, must match campaignStrategy.recommendedWinner
    creativeName: string,          // angle category in plain language
    why: string,
    expectedOutcome: string,       // short narrative, no numbers
    selectionRationale: string[],
    runOn: string,                 // "Meta Ads — Meta Feed + Instagram Feed"
  },
  actionPlan: {
    // Legacy/optional. Kept for backward compatibility in older plan_content
    // records, but the UI and PDF no longer render this section. Its content is
    // covered by recommendedFirstTest and testingPlan.
    platform: string,              // "Meta Ads"
    campaignType: string,          // "Meta Sales Campaign" (fixed, no invented names)
    audienceStrategy: string,      // "Start with broad targeting."
    audienceExplanation: string,
    optimizationGoal: string,      // "Purchases"
    optimizationReason: string,
    firstCreative: string,         // "Creative #N"
    budget: string,
    run: string,                   // "3 days"
    monitor: string[],
    decision: string,
  },
  creativeStrategies: [
    {
      creativeIndex: number,
      angleLabel: string,
      angleCategory: "Pain Point" | "Convenience" | "Emotional" | "Educational" | "Social Proof" | "Aspirational",
      psychology: string,
      primaryPlacement: string,    // "Meta Feed"
      secondaryPlacement: string,  // "Instagram Feed"
      testingPriority: number,     // 1, 2, 3
      bestUseCase: "Cold traffic" | "Broad testing" | "Retargeting",
      reasonToTest: string,
    }
  ],  // exactly 3 items in priority order
  testingIntensity: {
    minimum: string,               // "$20/day"
    recommended: string,           // "$50/day"
    fast: string,                  // "$100/day"
    explanation: string,           // budget disclaimer
  },
  testingPlan: {
    phase1: { create: string[], upload: string, run: string, evaluate: string[], decision: string },
    phase2: { pause: string, upload: string, run: string, evaluate: string },
    phase3: { condition: string, upload: string, run: string },
  },
  successCriteria: {
    purchases: { goal: string },
    ctr: { good: string, average: string, poor: string },
    cpc: { good: string, average: string, poor: string },
    costPerPurchase: { goal: string },
    decisionRules: { condition: string, action: string },
  },
  targetCpa: {
    sellingPrice: number,          // parsed extracted product price; 0 if unavailable
    recommendedMaximum: number,    // round(sellingPrice * 0.35)
    formatted: string,             // "<$XX" or a fallback message when price is unavailable
  },
  whyNotOthers: [
    { creativeIndex: number, reason: string }
  ],  // exactly 2 items (the non-winning creatives)
  whyWinner: string[],  // 4 systematic reasons the winner was selected
  workflow: {
    day1: string,
    day4: string,
    ifWinner: string,
    ifLoser: string,
    ifNone: string,
  },
  disclaimer: string,
}
```

**System prompt**: "You are a senior performance marketer and creative
strategist. Your job is to produce ONE unified Meta Ads testing playbook that
an e-commerce founder can act on immediately — not a generic AI report. Focus
exclusively on Meta Ads (Facebook and Instagram). Never reference TikTok or any
other ad platform. Never invent campaign names, specific performance targets,
CTR percentages, CPC values, ROAS assumptions, or exact conversion predictions.
Instead, name the KPIs to monitor and explain why each matters."

**Deterministic overrides** (applied in code after the AI returns, so the same
product always produces the same playbook shape): `campaignType` =
"Meta Sales Campaign", `audienceStrategy` = "Start with broad targeting.",
`optimizationGoal` = "Purchases", `whyWinner` = the four systematic reasons,
testing budgets = $20/$50/$100 per day with the budget disclaimer, phase
decisions = the three-branch testing logic, `successCriteria` = fixed
benchmark thresholds for Purchases/CTR/CPC/Cost Per Purchase plus the scale/pause
decision rule, `targetCpa` = calculated from the extracted product price as
`round(sellingPrice * 0.35)` with a fallback message when the price is
unavailable.

---

## Model Configuration

| Step | Edge Function | Model | Mode | Notes |
|------|--------------|-------|------|-------|
| Product context | `analyze-product` | gpt-4o | Structured output | Text + optional image input (vision) |
| Buyer insights | `analyze-product` | gpt-4o | Structured output | Text input |
| Ad angles + hooks | `generate-angles` | gpt-4o | Structured output | AI labels/hooks only; deterministic scoring in code |
| Ad concepts | `generate-concepts` | gpt-4o | Structured output | Text input |
| Ad copy | `generate-copy` | gpt-4o | Structured output | Text input |
| Ad images | `process-image-queue` | gpt-image-1 | Image generation | Via queue, 3 sequential jobs |
| Testing plan | `generate-testing-plan` | gpt-4o | Structured output | Text input |

**Fallback**: If `gpt-4o` is unavailable or quality is insufficient,
set `OPENAI_MODEL=gpt-4o-mini` via `supabase secrets set` — no code changes required.

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
