// Shared TypeScript types and interfaces for AngleCraft.
// Mirrors the database schema in supabase/migrations/<timestamp>_init.sql.

export type SessionStatus =
  | "input"
  | "extracting"
  | "analyzing"
  | "angles_generated"
  | "paid"
  | "generating"
  | "complete"
  | "failed";

export type InputType = "url" | "photo";

export type PaymentStatus = "pending" | "succeeded" | "failed";

export type ImageStatus = "pending" | "processing" | "complete" | "failed";

export type AngleLabel =
  | "convenience"
  | "time_saving"
  | "pain_point"
  | "healthy_lifestyle"
  | "perfect_gift";

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
  score: number | null;
  is_selected: boolean;
  created_at: string;
}

export interface AdCreative {
  id: string;
  session_id: string;
  angle_id: string;
  concept: string;
  headline: string | null;
  primary_text: string | null;
  cta: string | null;
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

export interface TestingPlanContent {
  platforms: string[];
  budgetAllocation: {
    meta: { totalBudget: string; perAngleBudget: string; duration: string };
    tiktok: { totalBudget: string; perAngleBudget: string; duration: string };
  };
  audienceGuidance: { meta: string; tiktok: string };
  testingDuration: { recommendedDays: number; reasoning: string };
  keyMetrics: { metric: string; target: string; why: string }[];
  perAngleGuidance: {
    angleLabel: string;
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
  score: number;
}

export interface GenerateAnglesResult {
  angles: GeneratedAngle[];
}

export interface GeneratedConcept {
  angleLabel: AngleLabel;
  concept: string;
}

export interface GenerateConceptsResult {
  concepts: GeneratedConcept[];
}

export interface GeneratedCopy {
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
    angleLabel: AngleLabel;
    concept: string;
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

export interface ImageQueueMessage {
  sessionId: string;
  angleId: string;
  concept: string;
  prompt: string;
}
