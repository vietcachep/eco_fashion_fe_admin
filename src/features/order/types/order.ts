import type { Money } from "@/types/common";

/*
 * Lưới chuyển trạng thái do NHÂN VIÊN thao tác — chép từ backend
 * `order/foundation/order.constants.ts` STAFF_TRANSITIONS. Chỉ dùng để hiện
 * đúng nút; backend vẫn kiểm lại. `cancelled` đi endpoint huỷ riêng (cần lý do).
 */
export const STAFF_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["packing", "cancelled"],
  packing: ["shipping"],
  shipping: ["delivered"],
  delivered: ["completed", "returned"],
  completed: ["returned"],
};

/* Trạng thái gửi qua PUT /status (không gồm cancelled/returned — đi luồng riêng). */
export const STATUS_ACTION_LABEL: Record<string, string> = {
  confirmed: "Xác nhận đơn",
  packing: "Bắt đầu đóng gói",
  shipping: "Giao cho vận chuyển",
  delivered: "Đã giao thành công",
  completed: "Hoàn tất đơn",
};

/*
 * Dòng danh sách đơn (GET /admin/orders) — backend có class OrderSummaryResponse
 * nhưng Swagger chỉ khai PageResponse trần nên Orval không sinh. Chép từ
 * `order/order/dto/order.responses.ts`.
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
  createdAt: string;
}
