import type {
  DeliveryFailedRequestReasonCode,
  OrderResponse,
  ShopCancelOrderRequestReasonCode,
  ShopOrderSummaryResponse,
  ShopUpdateOrderStatusRequestCarrier,
  ShopUpdateOrderStatusRequestStatus,
} from "@/lib/api/generated/model";
import type { CarrierOrderFields } from "@/types/shipping";

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
export type ShopOrderDetail = Omit<OrderResponse, "promotion" | "shopPromotion"> & CarrierOrderFields & {
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

// PLAN-0040 3.6 — giao có hãng + mã vận đơn (backend CARRIERS / TRACKING_CODE_PATTERN, order.constants.ts)
/* Thứ tự hiện trong ô chọn hãng; tên hiển thị ở `CARRIER_LABEL` (lib/labels.ts). Backend không có endpoint danh mục hãng. */
export const CARRIER_CODES = [
  "ghn",
  "ghtk",
  "viettel_post",
  "jnt",
  "spx",
  "ahamove",
  "ninja_van",
  "vnpost",
  "other",
] as const satisfies ReadonlyArray<ShopUpdateOrderStatusRequestCarrier>;

export function isCarrierCode(value: string): value is ShopUpdateOrderStatusRequestCarrier {
  return (CARRIER_CODES as ReadonlyArray<string>).includes(value);
}

/* Hãng KHÔNG có mẫu link tra cứu: shop tự nhập `trackingUrl` (https, tuỳ chọn). Hãng có mẫu thì backend tự sinh link. */
const CARRIERS_WITHOUT_TEMPLATE: ReadonlyArray<string> = ["other", "ahamove"];
export function carrierNeedsTrackingUrl(carrier: string): boolean {
  return CARRIERS_WITHOUT_TEMPLATE.includes(carrier);
}

/* Mã vận đơn: 4–40 ký tự chữ / số / gạch ngang, không khoảng trắng (không thể mang HTML hay URL độc vào thông báo / email). */
export const TRACKING_CODE_PATTERN = /^[A-Za-z0-9-]{4,40}$/;

// PLAN-0040 3.1 — huỷ đơn của shop
/* Mã lý do shop được chọn khi huỷ (backend SHOP_CANCEL_REASONS) — thứ tự = thứ tự hiện trong ô chọn. */
export const SHOP_CANCEL_REASON_CODES = [
  "out_of_stock",
  "price_error",
  "cannot_contact",
  "customer_request",
  "other",
] as const satisfies ReadonlyArray<ShopCancelOrderRequestReasonCode>;

/*
 * Việc huỷ này có bị +1 điểm vi phạm không — chép từ backend `shopCancelViolation` (foundation/cancel.rules.ts); một đơn tối đa MỘT điểm.
 * Trả câu giải thích cho cảnh báo trong hộp thoại, null = không bị tính. Chỉ để cảnh báo trước: điểm do backend ghi (bất đồng bộ, vài giây).
 */
export function shopCancelPenalty(input: { reasonCode: string; status: string; hadRejectedRequest: boolean }): string | null {
  if (input.reasonCode === "out_of_stock") return "huỷ vì hết hàng";
  if (input.reasonCode === "price_error") return "huỷ vì sai giá niêm yết";
  if (input.hadRejectedRequest) return "huỷ đơn sau khi đã từ chối yêu cầu huỷ của khách";
  if (input.status === "packing" && input.reasonCode !== "customer_request") return "huỷ đơn đã đóng gói";
  return null;
}

// PLAN-0040 3.7 — giao không thành công
/* Lý do báo giao không thành công (backend DELIVERY_FAILED_REASONS); nhãn ở `DELIVERY_FAILED_REASON_LABEL`. */
export const DELIVERY_FAILED_REASON_CODES = [
  "refused",
  "unreachable",
  "wrong_address",
  "lost",
  "damaged",
  "other",
] as const satisfies ReadonlyArray<DeliveryFailedRequestReasonCode>;

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
