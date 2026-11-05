/*
 * Một dòng lịch sử điểm vi phạm xử lý đơn của gian hàng — Swagger khai trang `PageResponse` không có schema phần tử nên chép tay
 * từ backend: eco_backend `src/modules/order/violation/shop-violation.controller.ts` (`ShopViolationResponse`). Dùng chung cho
 * cổng vendor (`GET /shop/violations`) và tab "Vi phạm" của sàn (`GET /admin/shops/{id}/violations`).
 * Tổng hợp 30 ngày (`ShopViolationSummaryResponse`) đã có kiểu sinh trong `@/lib/api/generated/model`.
 */
export type ShopViolationKind =
  | "confirm_timeout"
  | "ship_timeout"
  | "cancel_out_of_stock"
  | "cancel_price_error"
  | "cancel_packing"
  | "reject_then_cancel";

export interface ShopViolation {
  id: string;
  orderCode: string;
  /** Mã loại (xem `ShopViolationKind`) — chuỗi thường để mã mới của backend không làm vỡ màn. */
  kind: string;
  /** Nhãn tiếng Việt do backend trả — ưu tiên hiện nhãn này. */
  kindLabel: string;
  points: number;
  createdAt: string;
}
