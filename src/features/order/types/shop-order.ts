import type {
  OrderResponse,
  ShopOrderSummaryResponse,
  ShopUpdateOrderStatusRequestStatus,
} from "@/lib/api/generated/model";

/*
 * Kiểu riêng cho cổng nhà cung cấp (GET /shop/orders/**). Dòng danh sách dùng
 * lại `OrderSummaryResponse` của features/order/types/order.ts (backend dùng
 * chung DTO với khu quản trị); chi tiết dùng `OrderResponse` của Orval nhưng
 * chuẩn hoá hai trường voucher — xem ShopOrderDetail.
 */

/* Voucher gắn trên đơn. */
export interface OrderVoucher {
  code: string;
  name: string | null;
}

/*
 * Backend hiện trả `promotion` / `shopPromotion` dạng `{code, name}` nhưng spec
 * đã sync khai `shopPromotion` là chuỗi mã (bản cũ). Hook chuẩn hoá cả hai về
 * OrderVoucher để màn hình không phải đoán — đổi spec không làm vỡ UI.
 */
export type ShopOrderDetail = Omit<OrderResponse, "promotion" | "shopPromotion"> & {
  promotion: OrderVoucher | null;
  shopPromotion: OrderVoucher | null;
};

/*
 * Lưới chuyển trạng thái của VENDOR — chép từ backend
 * `order/order/service/shop-order.service.ts` VENDOR_TRANSITIONS (hẹp hơn lưới
 * nhân viên sàn: không completed/returned, huỷ đi endpoint riêng). Chỉ để hiện
 * đúng nút; backend vẫn kiểm lại (ORDER_INVALID_TRANSITION).
 */
export const VENDOR_NEXT_STATUS: Partial<Record<string, ShopUpdateOrderStatusRequestStatus>> = {
  pending: "confirmed",
  confirmed: "packing",
  packing: "shipping",
  shipping: "delivered",
};

export const VENDOR_ACTION_LABEL: Record<ShopUpdateOrderStatusRequestStatus, string> = {
  confirmed: "Xác nhận đơn",
  packing: "Bắt đầu đóng gói",
  shipping: "Giao cho vận chuyển",
  delivered: "Đã giao thành công",
};

/* Thứ tự tab trạng thái trên màn danh sách (khoá trùng ShopOrderSummaryResponse để lấy số đơn). */
export const SHOP_ORDER_STATUS_TABS = [
  "pending",
  "confirmed",
  "packing",
  "shipping",
  "delivered",
  "completed",
  "cancelled",
  "returned",
] as const satisfies ReadonlyArray<keyof ShopOrderSummaryResponse>;

/* Đơn "cần xử lý ngay": chờ xác nhận VÀ (COD hoặc đã thanh toán) — khớp `pending.awaitingConfirm` của báo cáo. */
export function isActionablePending(o: { status: string; paymentMethodCode: string; paymentStatus: string }): boolean {
  return o.status === "pending" && (o.paymentMethodCode === "cod" || o.paymentStatus === "paid");
}

/* Đơn online chưa nhận tiền: chưa xác nhận được (backend chặn bằng ORDER_INVALID_TRANSITION). */
export function isAwaitingOnlinePayment(o: { status: string; paymentMethodCode: string; paymentStatus: string }): boolean {
  return o.status === "pending" && o.paymentMethodCode !== "cod" && o.paymentStatus !== "paid";
}

/* Mô tả biến thể từ snapshot đơn: thời trang "Đen / M", ngành động "Đen / 128GB" — rỗng thì bỏ qua. */
export function variantText(item: { color?: string | null; size?: string | null }): string {
  return [item.color, item.size].filter((s) => !!s && s.trim() !== "").join(" / ");
}
