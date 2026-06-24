// Shared Zod schemas for OpenAI structured outputs.
// Imported by all Supabase Edge Functions via relative import.
// Used with zodResponseFormat() + client.beta.chat.completions.parse().

import { z } from "npm:zod@3.24.1";

export const ProductContextSchema = z.object({
  name: z.string(),
  category: z.string(),
  description: z.string(),
  keyBenefits: z.array(z.string()).min(3).max(5),
  audienceSignals: z.array(z.string()).min(3).max(5),
  priceRange: z.string(),
});

export const BuyerInsightsSchema = z.object({
  buyerProfile: z.string(),
  mainDesire: z.string(),
  painPoints: z.array(z.string()).min(3).max(5),
  buyingTriggers: z.array(z.string()).min(3).max(5),
  objections: z.array(z.string()).min(2).max(3),
});

export const AngleLabelSchema = z.enum([
  "convenience",
  "time_saving",
  "pain_point",
  "healthy_lifestyle",
  "perfect_gift",
]);

export const AdAnglesSchema = z.object({
  angles: z
    .array(
      z.object({
        angleLabel: AngleLabelSchema,
        hook: z.string(),
        rationale: z.string(),
        score: z.number().int().min(1).max(100),
      })
    )
    .length(5),
});

export const AdConceptsSchema = z.object({
  concepts: z
    .array(
      z.object({
        angleLabel: AngleLabelSchema,
        concept: z.string(),
      })
    )
    .length(3),
});

export const AdCopySchema = z.object({
  creatives: z
    .array(
      z.object({
        angleLabel: AngleLabelSchema,
        headline: z.string().max(40),
        primaryText: z.string().max(200),
        cta: z.string().max(20),
      })
    )
    .length(3),
});

export const TestingPlanSchema = z.object({
  platforms: z.array(z.string()),
  budgetAllocation: z.object({
    meta: z.object({
      totalBudget: z.string(),
      perAngleBudget: z.string(),
      duration: z.string(),
    }),
    tiktok: z.object({
      totalBudget: z.string(),
      perAngleBudget: z.string(),
      duration: z.string(),
    }),
  }),
  audienceGuidance: z.object({
    meta: z.string(),
    tiktok: z.string(),
  }),
  testingDuration: z.object({
    recommendedDays: z.number().int().min(1),
    reasoning: z.string(),
  }),
  keyMetrics: z.array(
    z.object({
      metric: z.string(),
      target: z.string(),
      why: z.string(),
    })
  ),
  perAngleGuidance: z.array(
    z.object({
      angleLabel: z.string(),
      priority: z.string(),
      hypothesis: z.string(),
      recommendation: z.string(),
    })
  ),
});

export type ProductContext = z.infer<typeof ProductContextSchema>;
export type BuyerInsights = z.infer<typeof BuyerInsightsSchema>;
export type AdAngles = z.infer<typeof AdAnglesSchema>;
export type AdConcepts = z.infer<typeof AdConceptsSchema>;
export type AdCopy = z.infer<typeof AdCopySchema>;
export type TestingPlan = z.infer<typeof TestingPlanSchema>;
