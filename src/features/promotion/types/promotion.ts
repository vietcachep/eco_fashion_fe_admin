import type { Money } from "@/types/common";

/* DTO khuyến mãi — chép từ backend `promotion/promotion.service.ts`. */
export interface PromotionOfferResponse {
  code: string;
  type: string;
  name: string | null;
  description: string | null;
  endAt: string;
  displayDiscount: Money;
  displayValue: Money | null;
  displayMinOrderAmount: Money | null;
  displayMaxDiscount: Money | null;
  displayMissingAmount: Money | null;
  percentValue: number | null;
  eligible: boolean;
  reason: string | null;
}

export interface PromotionAdminResponse extends PromotionOfferResponse {
  id: string;
  usageLimit: number | null;
  usageLimitPerUser: number | null;
  usedCount: number;
  appliesTo: string;
  targets: Array<{ targetType: string; targetRef: string }>;
  startAt: string;
  isActive: boolean;
  isPublic: boolean;
}

export interface PromotionUsageRow {
  id: string;
  userId: string;
  orderCode: string;
  discountAmount: Money;
  createdAt: string;
  releasedAt: string | null;
}
