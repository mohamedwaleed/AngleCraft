// @ts-nocheck
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

// Candidate angle taxonomy for the MVP. The AI never picks, ranks, scores, or
// reorders angles — it only generates a hook and a rationale for each candidate
// label in the fixed pool. Scoring/ranking is deterministic and lives in
// generate-angles.
export const AngleLabelSchema = z.enum([
  "pain_point",
  "convenience",
  "time_saving",
  "gift",
  "lifestyle",
  "emotional",
  "educational",
  "aspiration",
  "transformation",
  "social_proof",
]);

// AI returns rich buyer-psychology data for every predefined angle label. No
// scores, rankings, or winner predictions — those are applied deterministically
// in code.
export const AdAnglesSchema = z.object({
  angles: z
    .array(
      z.object({
        angleLabel: AngleLabelSchema,
        angleName: z.string(),
        buyerEmotion: z.string(),
        purchaseMotivation: z.string(),
        psychologicalTrigger: z.string(),
        problemSolved: z.string(),
        idealAudience: z.string(),
        useCase: z.string(),
        rationale: z.string(),
        exampleHook: z.string(),
      })
    )
    .length(10),
});

export const AdConceptsSchema = z.object({
  concepts: z
    .array(
      z.object({
        creativeIndex: z.number().int().min(1).max(3),
        angleLabel: AngleLabelSchema,
        concept: z.string(),
        visualStyle: z.string(),
        placement: z.enum(["Meta Feed", "Instagram Feed"]),
        aspectRatio: z.enum(["1:1", "4:5"]),
      })
    )
    .length(3),
});

export const AdCopySchema = z.object({
  creatives: z
    .array(
      z.object({
        creativeIndex: z.number().int().min(1).max(3),
        angleLabel: AngleLabelSchema,
        headline: z.string().max(40),
        primaryText: z.string().max(200),
        cta: z.string().max(20),
      })
    )
    .length(3),
});

export const BestUseCaseSchema = z.enum([
  "Cold traffic",
  "Broad testing",
  "Retargeting",
]);

export const AngleCategorySchema = z.enum([
  "Pain Point",
  "Convenience",
  "Emotional",
  "Educational",
  "Social Proof",
  "Aspirational",
]);

export const TestingPlanSchema = z.object({
  platforms: z.array(z.string()).optional().default(["Meta Ads"]),
  campaignStrategy: z.object({
    creativePriorities: z.array(z.number().int().min(1).max(3)).length(3),
    primaryPlatform: z.string(),
    primaryPlacement: z.string(),
    testingDurationDays: z.number().int().min(1),
    evaluationMetrics: z.array(z.string()).min(1),
    phaseOrder: z.array(z.number().int().min(1).max(3)).length(3),
  }),
  customerInsights: z.object({
    targetBuyer: z.string(),
    mainPain: z.string(),
    mainDesire: z.string(),
    mainBuyingTrigger: z.string(),
    mainObjection: z.string(),
    mostImportantBuyerEmotion: z.string(),
  }),
  creativeStrategies: z.array(
    z.object({
      creativeIndex: z.number().int().min(1).max(3),
      angleLabel: z.string(),
      angleCategory: AngleCategorySchema,
      psychology: z.string(),
      primaryPlacement: z.string(),
      secondaryPlacement: z.string(),
      testingPriority: z.number().int().min(1).max(3),
      bestUseCase: BestUseCaseSchema,
      reasonToTest: z.string(),
    })
  ).length(3),
  testingIntensity: z.object({
    minimum: z.string(),
    recommended: z.string(),
    fast: z.string(),
    explanation: z.string(),
  }),
  recommendedTestingSetup: z.object({
    approach: z.string(),
    campaignObjective: z.string(),
    creatives: z.array(z.number().int().min(1).max(3)).min(1),
    budget: z.object({
      minimum: z.string(),
      recommended: z.string(),
    }),
    runTime: z.string(),
    monitor: z.array(z.string()).min(1),
    afterTesting: z.array(z.string()).min(1),
  }),
  successCriteria: z.object({
    purchases: z.object({ goal: z.string() }),
    ctr: z.object({ good: z.string(), average: z.string(), poor: z.string() }),
    cpc: z.object({ good: z.string(), average: z.string(), poor: z.string() }),
    costPerPurchase: z.object({ goal: z.string() }),
    decisionRules: z.object({ condition: z.string(), action: z.string() }),
  }),
  targetCpa: z.object({
    sellingPrice: z.number(),
    recommendedMaximum: z.number(),
    formatted: z.string(),
  }),
  workflow: z.object({
    day1: z.string(),
    day4: z.string(),
    ifPerforms: z.string(),
    ifUnderperforms: z.string(),
    ifNone: z.string(),
  }),
  disclaimer: z.string(),
  // Legacy fields kept for backward compatibility with previously generated plans.
  campaignStrategyLegacy: z.object({
    targetCustomer: z.string(),
    mainPain: z.string(),
    mainDesire: z.string(),
    primaryBuyingTrigger: z.string(),
    recommendedFirstAngle: z.string(),
  }).optional(),
  budgetAllocation: z.object({
    meta: z.object({
      totalBudget: z.string(),
      perAngleBudget: z.string(),
      duration: z.string(),
    }),
  }).optional(),
  testingDuration: z.object({
    recommendedDays: z.number().int().min(1),
    reasoning: z.string(),
  }).optional(),
  keyMetrics: z.array(
    z.object({
      metric: z.string(),
      target: z.string(),
      why: z.string(),
    })
  ).optional(),
  perAngleGuidance: z.array(
    z.object({
      angleLabel: z.string(),
      creativeIndex: z.number().int().min(1).max(3).optional(),
      priority: z.string(),
      hypothesis: z.string(),
      recommendation: z.string(),
    })
  ).optional(),
});

export type ProductContext = z.infer<typeof ProductContextSchema>;
export type BuyerInsights = z.infer<typeof BuyerInsightsSchema>;
export type AdAngles = z.infer<typeof AdAnglesSchema>;
export type AdConcepts = z.infer<typeof AdConceptsSchema>;
export type AdCopy = z.infer<typeof AdCopySchema>;
export type TestingPlan = z.infer<typeof TestingPlanSchema>;
