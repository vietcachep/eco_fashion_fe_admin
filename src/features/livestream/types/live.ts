import type { ProductCardResponse } from "@/lib/api/generated/model";
import type { Money } from "@/types/common";

/* Domain shapes bổ sung PageResponse không generic và enum trạng thái; transport dùng Orval đã đồng bộ từ backend. */
export type LiveState =
  | "draft"
  | "scheduled"
  | "starting"
  | "live"
  | "reconnecting"
  | "ended"
  | "terminated"
  | "cancelled";
export interface LiveSession {
  id: string;
  shopId: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  scheduledAt: string | null;
  state: LiveState;
  mode: "public" | "rehearsal";
  version: number;
  startedAt: string | null;
  endedAt: string | null;
  endReason: string | null;
  mediaStopStatus: "none" | "pending" | "confirmed" | "failed";
  pinnedProductId: string | null;
  pinnedMessageId: string | null;
  viewerCount: number;
  productsCount: number;
  canModerate?: boolean;
  mediaAvailable?: boolean;
  shop: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
  } | null;
  isFollowing: boolean;
}
export interface SessionInput {
  title: string;
  description?: string;
  coverUrl?: string | null;
  scheduledAt?: string | null;
  productIds?: string[];
}
export interface LiveProduct {
  productId: string;
  displayNumber: number;
  position: number;
  pinned: boolean;
  card: ProductCardResponse;
}
export interface HostGrant {
  session: LiveSession;
  token: string;
  serverUrl: string;
  participantIdentity: string;
  expiresAt: string;
}
export interface LiveMessage {
  id: string;
  sequence: number;
  userId: string;
  displayName: string;
  body: string;
  replyToId?: string | null;
  createdAt: string;
  deleted: boolean;
}
export interface LiveReport {
  session: LiveSession;
  views: number;
  uniqueViewers: number;
  peakViewers: number;
  messageCount: number;
  likes: number;
  productClicks: number;
  commerce?: {
    orders: number;
    paidOrders: number;
    revenue: Money;
    refunded: Money;
  };
}
export interface ContentReport {
  id: string;
  sessionId: string;
  reason: string;
  description: string | null;
  status: string;
  createdAt: string;
}
export interface ModerationInput {
  action:
    | "delete_message"
    | "pin_message"
    | "unpin_message"
    | "mute"
    | "unmute";
  messageId?: string;
  userId?: string;
  reason?: string;
}
export interface LiveCampaign {
  id: string;
  sessionId: string;
  shopId: string;
  code: string;
  name: string;
  type: "percentage" | "fixed_amount" | "free_shipping";
  scope: "shop" | "platform";
  value: string;
  minOrderAmount: Money;
  maxDiscount: Money | null;
  claimLimit: number | null;
  usageLimit: number | null;
  claimedCount: number;
  usedCount: number;
  state: "draft" | "active" | "closed" | "revoked";
  redeemUntil: string | null;
  policyVersion: "FITLY_LIVE_V1";
}
export interface CampaignInput {
  code: string;
  name: string;
  type: LiveCampaign["type"];
  value: number;
  minOrderAmount?: string;
  maxDiscount?: string;
  claimLimit?: number;
  usageLimit?: number;
  scope?: "shop";
}
export interface SessionListQuery {
  page?: number;
  size?: number;
  state?: string;
  q?: string;
  shopId?: string;
}
export const LIVE_LABELS: Record<LiveState, string> = {
  draft: "Nháp",
  scheduled: "Đã lên lịch",
  starting: "Đang khởi động",
  live: "Đang phát",
  reconnecting: "Đang kết nối lại",
  ended: "Đã kết thúc",
  terminated: "Sàn đã dừng",
  cancelled: "Đã huỷ",
};
export const ACTIVE_LIVE = new Set<LiveState>([
  "starting",
  "live",
  "reconnecting",
]);
