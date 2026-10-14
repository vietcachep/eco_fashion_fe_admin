import type { Money } from "@/types/common";

/*
 * DTO khuyến mãi — chép từ backend `promotion/promotion.service.ts`
 * (PromotionOfferResponse / PromotionAdminResponse). Orval chỉ sinh `void` cho
 * các endpoint mã giảm giá nên kiểu response viết tay ở đây, ép đúng một chỗ
 * trong hook.
 */
export interface PromotionOfferResponse {
  code: string;
  /** platform = sàn chịu giảm giá (áp cả giỏ) · shop = gian hàng chịu (chỉ áp đơn con của shop). */
  scope: "platform" | "shop";
  shopId: string | null;
  /** Backend hiện luôn trả null ở API quản trị — màn sàn tự tra tên từ danh sách shop. */
  shopName: string | null;
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

/* Giai đoạn hiển thị của mã — suy từ isActive + thời gian (xem `promotionPhase`). */
export type PromotionPhase = "running" | "upcoming" | "expired" | "off";

/* `userId` luôn null ở cổng vendor — backend ẩn danh khách với shop. */
export interface PromotionUsageRow {
  id: string;
  userId: string | null;
  orderCode: string;
  discountAmount: Money;
  createdAt: string;
  releasedAt: string | null;
}

/* Một sản phẩm của shop trong ô chọn phạm vi áp dụng (rút gọn từ GET /shop/products). */
export interface ShopProductOption {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  status: string;
}
