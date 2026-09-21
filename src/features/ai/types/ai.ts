import type { Money } from "@/types/common";
import type { ProductCardResponse } from "@/lib/api/generated/model";

export type { ClassifyProductResponse, PrecheckResponse } from "@/types/ai-staff-tools";

/*
 * DTO module ai (khu quản trị) — Swagger không khai schema response nên chép
 * từ backend `src/modules/ai/**` (knowledge, insight, chat, review-ai, signal,
 * usage). Backend đổi DTO phải đổi đây.
 */
export interface AiDocumentResponse {
  id: string;
  title: string;
  kind: string;
  content: string;
  status: string;
  error: string | null;
  isActive: boolean;
  chunkCount: number;
  updatedAt: string;
}

export interface AiIndexStatus {
  documents: {
    total: number;
    ready: number;
    pending: number;
    failed: number;
    chunks: number;
    chunksWithVector: number;
    lastIndexedAt: string | null;
  };
  products: { active: number; ready: number; pending: number; failed: number; lastIndexedAt: string | null };
  faqs: { ready: number; pending: number; failed: number };
  reviewSummaries: number;
  embeddingEnabled: boolean;
}

export interface SupportRequestResponse {
  id: string;
  sessionId: string | null;
  userId: string | null;
  email: string | null;
  summary: string;
  status: string;
  assignedTo: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  note: string | null;
  createdAt: string;
}

export interface ChatSessionRow {
  id: string;
  userId: string | null;
  guestKey: string | null;
  title: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface ChatSessionDetail {
  id: string;
  messages: Array<{ role: string; text: string; source: string; tools: string[]; guard: string | null; createdAt: string }>;
}

export interface ChatInsightsResponse {
  generatedAt: string;
  days: number;
  sessions: number;
  questions: number;
  misses: number;
  handoffs: number;
  ruleFallbacks: number;
  clusters: Array<{ label: string; suggestedTitle: string; count: number; examples: string[] }>;
  generatedByAi: boolean;
}

export interface ModerationFlagResponse {
  reviewId: string;
  label: string;
  score: number;
  reason: string | null;
  model: string;
  createdAt: string;
  review: { productId: string; rating: number; content: string; status: string } | null;
}

export interface ModerationFlagPage {
  items: ModerationFlagResponse[];
  total: number;
  page: number;
  size: number;
}

export interface InventoryInsightsResponse {
  generatedAt: string;
  windowDays: number;
  items: Array<{
    variantId: string;
    productId: string;
    productName: string;
    slug: string;
    sku: string;
    label: string;
    available: number;
    sold30d: number;
    dailyRate: number;
    daysLeft: number | null;
    level: "critical" | "warning" | "ok" | "stale" | "out";
  }>;
  criticalCount: number;
  warningCount: number;
  staleCount: number;
  outCount: number;
  aiSummary: string | null;
  generatedByAi: boolean;
}

export interface RevenueInsightResponse {
  generatedAt: string;
  current: { from: string; to: string; revenue: Money; orders: number; itemsSold: number; refunded: Money };
  previous: { from: string; to: string; revenue: Money; orders: number; itemsSold: number; refunded: Money };
  deltaRevenuePct: number | null;
  deltaOrdersPct: number | null;
  topProducts: Array<{ name: string; slug: string; quantity: number; revenue: Money }>;
  aiSummary: string | null;
  generatedByAi: boolean;
}

export interface ComboSuggestionsResponse {
  generatedAt: string;
  windowDays: number;
  combos: Array<{
    name: string;
    reason: string;
    discountPercent: number;
    evidence: "orders" | "similar";
    orders: number;
    products: ProductCardResponse[];
  }>;
  generatedByAi: boolean;
}

export interface AiUsageSummary {
  budget: number;
  usedToday: number;
  byDay: Array<{ day: string; tokens: number; calls: number; cost: string }>;
  byFeature: Array<{ feature: string; tokens: number; calls: number; cost: string; failed: number }>;
}

export interface RecommendationStatsResponse {
  generatedAt: string;
  days: number;
  totalImpressions: number;
  totalClicks: number;
  sources: Array<{
    source: string;
    impressions: number;
    clicks: number;
    ctr: number;
    addToCart: number;
    purchases: number;
    conversion: number;
  }>;
}

export interface CopyResult {
  text: string;
  source: string;
}

export interface AskResult {
  answer: string;
  tools: string[];
  source: string;
}

export interface ReviewSummaryResponse {
  productId: string;
  summary: string;
  pros: string[];
  cons: string[];
  reviewCount: number;
  updatedAt: string;
}
