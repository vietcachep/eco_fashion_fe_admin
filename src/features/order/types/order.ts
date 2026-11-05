import type { OrderCancelRequestResponseStatus, OrderRefundResponse } from "@/lib/api/generated/model";
import type { Money } from "@/types/common";

/*
 * Lưới chuyển trạng thái do NHÂN VIÊN thao tác — chép từ backend
 * `order/foundation/order.constants.ts` STAFF_TRANSITIONS. Chỉ dùng để hiện
 * đúng nút; backend vẫn kiểm lại. `cancelled` đi endpoint huỷ riêng (cần lý do).
 * `packing → cancelled` (PLAN-0027, CAN-08): CSKH huỷ đơn ĐÓNG GÓI khi tranh chấp / shop mất liên lạc.
 * `shipping → cancelled` (PLAN-0022): huỷ đơn ĐANG GIAO khi tranh chấp, bắt buộc lý do ≥ 10 ký tự.
 * `returned` không còn ở đây: trả hàng chỉ đi qua luồng đổi trả (hoàn kho + hoàn tiền + đảo hoa hồng).
 */
export const STAFF_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["packing", "cancelled"],
  packing: ["shipping", "cancelled"],
  shipping: ["delivered", "cancelled"],
  delivered: ["completed"],
  completed: [],
};

/* Huỷ đơn đang đóng gói / đang giao phải kèm lý do rõ ràng (backend 400 nếu < 10 ký tự); các trạng thái khác chỉ cần 3. */
export const IN_TRANSIT_CANCEL_MIN_REASON = 10;

/* Đơn đang đóng gói / đang giao — nhóm bị luật lý do chặt hơn khi sàn huỷ. */
export function isInTransitStatus(status: string): boolean {
  return status === "packing" || status === "shipping";
}

/* Mã lý do sàn được chọn khi huỷ thay khách (backend PLATFORM_CANCEL_REASONS). */
export const ADMIN_CANCEL_REASON_CODES = ["dispute", "fraud", "other"] as const;
export type AdminCancelReasonCode = (typeof ADMIN_CANCEL_REASON_CODES)[number];

/*
 * Dòng danh sách đơn (GET /admin/orders, GET /shop/orders) — backend có class OrderSummaryResponse
 * nhưng Swagger chỉ khai PageResponse trần nên Orval không sinh. Chép từ
 * `order/order/dto/order.responses.ts`.
 * PLAN-0027: `confirmDueAt` / `shipDueAt` (NULL = đơn cũ chưa có hạn) + `cancelRequestStatus` (khách có yêu cầu huỷ đơn đóng gói).
 */
export interface OrderSummaryResponse {
  code: string;
  status: string;
  statusLabel: string;
  paymentMethodCode: string;
  paymentStatus: string;
  itemCount: number;
  total: Money;
  firstItemName: string | null;
  firstItemImage: string | null;
  recipientName: string;
  refund?: OrderRefundResponse | null;
  confirmDueAt?: string | null;
  shipDueAt?: string | null;
  cancelRequestStatus?: OrderCancelRequestResponseStatus | null;
  createdAt: string;
}

/*
 * Hạn shop đang phải đáp ứng theo trạng thái: chờ xác nhận → hạn xác nhận; đã xác nhận / đang đóng gói → hạn giao. Trạng thái khác
 * (đang giao, đã huỷ…) không còn hạn của shop nên trả null dù backend vẫn lưu mốc cũ. Hạn null (đơn cũ) → null.
 */
export function pendingDue(o: { status: string; confirmDueAt?: string | null; shipDueAt?: string | null }): { label: string; at: string } | null {
  if (o.status === "pending" && o.confirmDueAt) return { label: "Hạn xác nhận", at: o.confirmDueAt };
  if ((o.status === "confirmed" || o.status === "packing") && o.shipDueAt) return { label: "Hạn giao", at: o.shipDueAt };
  return null;
}
