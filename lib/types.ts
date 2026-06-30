// Shared TypeScript types and interfaces for AngleCraft.
// Mirrors the database schema in supabase/migrations/<timestamp>_init.sql.

export type SessionStatus =
  | "input"
  | "extracting"
  | "analyzing"
  | "generating_angles"
  | "angles_generated"
  | "paid"
  | "generating"
  | "complete"
  | "failed";

export type InputType = "url" | "photo";

export type PaymentStatus = "pending" | "succeeded" | "failed";

export type ImageStatus = "pending" | "processing" | "complete" | "failed";

export type AngleLabel =
  | "pain_point"
  | "convenience"
  | "time_saving"
  | "gift"
  | "lifestyle"
  | "emotional"
  | "educational"
  | "social_proof"
  | "fear"
  | "aspiration"
  | "status"
  | "transformation";

export interface Session {
  id: string;
  token: string;
  status: SessionStatus;
  created_at: string;
  expires_at: string;
}

export interface ProductContext {
  name: string;
  category: string;
  description: string;
  keyBenefits: string[];
  audienceSignals: string[];
  priceRange: string;
}

export interface ProductInput {
  id: string;
  session_id: string;
  input_type: InputType;
  url: string | null;
  image_storage_path: string | null;
  extracted_name: string | null;
  extracted_description: string | null;
  extracted_price: string | null;
  extracted_features: string[] | null;
  extracted_image_url: string | null;
  product_context: ProductContext | null;
  created_at: string;
}

export interface BuyerInsights {
  id: string;
  session_id: string;
  buyer_profile: string;
  main_desire: string;
  pain_points: string[];
  buying_triggers: string[];
  objections: string[];
  created_at: string;
}

export interface AdAngle {
  id: string;
  session_id: string;
  angle_label: AngleLabel;
  hook: string;
  rationale: string | null;
  score: number | null;
  is_selected: boolean;
  created_at: string;
}

export interface AdCreative {
  id: string;
  session_id: string;
  angle_id: string;
  creative_index: number;
  concept: string;
  placement: string | null;
  aspect_ratio: AspectRatio | null;
  headline: string | null;
  primary_text: string | null;
  cta: string | null;
  image_text: string | null;
  image_storage_path: string | null;
  image_status: ImageStatus;
  created_at: string;
}

export interface TestingPlan {
  id: string;
  session_id: string;
  plan_content: TestingPlanContent;
  created_at: string;
}

export interface CampaignStrategy {
  recommendedWinner: number;
  creativePriorities: number[];
  primaryPlatform: string;
  primaryPlacement: string;
  testingDurationDays: number;
  evaluationMetrics: string[];
  phaseOrder: number[];
}

export interface CustomerInsightsData {
  targetBuyer: string;
  mainPain: string;
  mainDesire: string;
  mainBuyingTrigger: string;
  mainObjection: string;
  mostImportantBuyerEmotion: string;
}

export interface RecommendedFirstTest {
  creativeIndex: number;
  creativeName: string;
  why: string;
  expectedOutcome: string;
  selectionRationale: string[];
  runOn: string;
}

export interface ActionPlan {
  platform: string;
  campaignType: string;
  audienceStrategy: string;
  audienceExplanation: string;
  optimizationGoal: string;
  optimizationReason: string;
  firstCreative: string;
  budget: string;
  run: string;
  monitor: string[];
  decision: string;
  // Legacy fields kept optional for backward compatibility with older plans.
  campaign?: string;
  adSet?: string;
}

export interface CreativeStrategy {
  creativeIndex: number;
  angleLabel: string;
  angleCategory:
    | "Pain Point"
    | "Convenience"
    | "Emotional"
    | "Educational"
    | "Social Proof"
    | "Aspirational";
  psychology: string;
  primaryPlacement: string;
  secondaryPlacement: string;
  testingPriority: number;
  bestUseCase: "Cold traffic" | "Broad testing" | "Retargeting";
  reasonToTest: string;
}

export interface TestingIntensity {
  minimum: string;
  recommended: string;
  fast: string;
  explanation: string;
}

export interface SuccessCriteria {
  purchases: { goal: string };
  ctr: { good: string; average: string; poor: string };
  cpc: { good: string; average: string; poor: string };
  costPerPurchase: { goal: string };
  decisionRules: { condition: string; action: string };
}

export interface TargetCpa {
  sellingPrice: number;
  recommendedMaximum: number;
  formatted: string;
}

export interface TestingPhasePlan {
  phase1: {
    create: string[];
    upload: string;
    run: string;
    evaluate: string[];
    decision: string;
  };
  phase2: {
    pause: string;
    upload: string;
    run: string;
    evaluate: string;
  };
  phase3: {
    condition: string;
    upload: string;
    run: string;
  };
}

export interface WhyNotOther {
  creativeIndex: number;
  reason: string;
}

export interface WhyWinner {
  reasons: string[];
}

export interface WorkflowGuidance {
  day1: string;
  day4: string;
  ifWinner: string;
  ifLoser: string;
  ifNone: string;
}

export interface TestingPlanContent {
  platforms?: string[];
  campaignStrategy: CampaignStrategy;
  customerInsights: CustomerInsightsData;
  recommendedFirstTest: RecommendedFirstTest;
  actionPlan: ActionPlan;
  creativeStrategies: CreativeStrategy[];
  testingIntensity: TestingIntensity;
  testingPlan: TestingPhasePlan;
  successCriteria?: SuccessCriteria;
  targetCpa?: TargetCpa;
  whyNotOthers: WhyNotOther[];
  whyWinner: string[];
  workflow: WorkflowGuidance;
  disclaimer: string;
  // Legacy fields kept for backward compatibility with previously generated plans.
  recommendedFirstTestLegacy?: {
    creativeIndex: number;
    creativeName: string;
    why: string;
    expectedOutcome: string;
    selectionRationale: string[];
    expectedResult: {
      ctr: string;
      primaryKPI: string;
      secondaryKPI: string;
    };
    runOn: string;
  };
  campaignStrategyLegacy?: {
    targetCustomer: string;
    mainPain: string;
    mainDesire: string;
    primaryBuyingTrigger: string;
    recommendedFirstAngle: string;
  };
  budgetAllocation?: {
    meta: { totalBudget: string; perAngleBudget: string; duration: string };
  };
  testingRecommendation?: {
    phase1: {
      creatives: number[];
      platform: string;
      budgetSplit: string;
      duration: string;
      successMetric: string;
    };
    phase2: {
      creatives: number[];
      condition: string;
    };
  };
  budget?: {
    conservative: string;
    standard: string;
    aggressive: string;
    disclaimer: string;
  };
  testingDuration?: { recommendedDays: number; reasoning: string };
  keyMetrics?: { metric: string; target: string; why: string }[];
  perAngleGuidance?: {
    angleLabel: string;
    creativeIndex?: number;
    priority: string;
    hypothesis: string;
    recommendation: string;
  }[];
}

export interface Payment {
  id: string;
  session_id: string;
  stripe_session_id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  created_at: string;
  completed_at: string | null;
}

// --- Edge Function result types (mirror Zod schemas in _shared/schemas.ts) ---

export interface AnalyzeProductResult {
  productContext: ProductContext;
  buyerInsights: {
    buyerProfile: string;
    mainDesire: string;
    painPoints: string[];
    buyingTriggers: string[];
    objections: string[];
  };
}

export interface GeneratedAngle {
  angleLabel: AngleLabel;
  hook: string;
  rationale: string;
  criteria: {
    purchaseIntent: number;
    audienceReach: number;
    creativePotential: number;
    emotionalStrength: number;
  };
  score: number;
}

export interface GenerateAnglesResult {
  angles: GeneratedAngle[];
}

export type AspectRatio = "1:1" | "9:16" | "16:9" | "4:5";

export interface GeneratedConcept {
  creativeIndex: number;
  angleLabel: AngleLabel;
  concept: string;
  visualStyle: string;
  placement: string;
  aspectRatio: AspectRatio;
  imageText?: string;
}

export interface GenerateConceptsResult {
  concepts: GeneratedConcept[];
}

export interface GeneratedCopy {
  creativeIndex: number;
  angleLabel: AngleLabel;
  headline: string;
  primaryText: string;
  cta: string;
}

export interface GenerateCopyResult {
  creatives: GeneratedCopy[];
}

// --- API request/response types ---

export interface ExtractResponse {
  sessionId: string;
  status: SessionStatus;
  product: {
    name: string | null;
    description: string | null;
    price: string | null;
    features: string[] | null;
    imageUrl: string | null;
  };
}

export interface AnalyzeResponse {
  status: SessionStatus;
  buyerInsights: {
    buyerProfile: string;
    mainDesire: string;
    painPoints: string[];
    buyingTriggers: string[];
    objections: string[];
  };
}

export interface AnglesResponse {
  status: SessionStatus;
  angles: {
    id: string;
    angleLabel: AngleLabel;
    hook: string;
    rationale: string;
    score: number;
    isSelected: boolean;
  }[];
}

export interface CheckoutResponse {
  checkoutUrl: string;
}

export interface ConceptsResponse {
  status: SessionStatus;
  concepts: {
    angleId: string;
    creativeIndex: number;
    angleLabel: AngleLabel;
    concept: string;
    placement: string;
    aspectRatio: AspectRatio;
    imageText?: string;
  }[];
}

export interface CreativesResponse {
  status: SessionStatus;
  creatives: {
    id: string;
    angleLabel: AngleLabel;
    headline: string;
    primaryText: string;
    cta: string;
    imageStatus: ImageStatus;
  }[];
}

export interface TestingPlanResponse {
  status: SessionStatus;
  testingPlan: TestingPlanContent;
}

export interface ImageQueueMessage {
  sessionId: string;
  creativeId: string;
  concept: string;
  prompt: string;
  aspectRatio: AspectRatio;
  productImageUrl: string;
}
