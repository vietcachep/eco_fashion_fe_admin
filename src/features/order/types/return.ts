import type { ReturnRequestResponse } from "@/lib/api/generated/model";
import { RETURN_STATUS, statusMeta, type StatusMeta } from "@/lib/labels";

/*
 * Hằng/hàm thuần cho màn đổi trả (PLAN-0022). Dữ liệu response dùng thẳng kiểu Orval (`ReturnRequestResponse` / `ShopReturnRequestResponse`);
 * chỉ những gì suy từ trạng thái để hiện đúng tab / nút nằm ở đây. Backend vẫn là nơi kiểm chuyển trạng thái (ORDER_RETURN_INVALID_STATE).
 */

/* Tab lọc cổng SHOP — một tab = một trạng thái (API lọc theo đúng một `status`). Đã rút / hết hạn gửi hàng xem ở "Tất cả". */
export const SHOP_RETURN_TABS = [
  { key: "", label: "Tất cả" },
  { key: "requested", label: "Chờ duyệt" },
  { key: "approved", label: "Chờ nhận hàng" },
  { key: "escalated", label: "Khiếu nại / chờ sàn" },
  { key: "received", label: "Đang hoàn tiền" },
  { key: "refunded", label: "Hoàn tất" },
  { key: "rejected", label: "Đã từ chối" },
] as const;

/*
 * "Tất cả" của cổng SÀN dùng khoá riêng thay vì chuỗi rỗng: bộ lọc đồng bộ lên URL bỏ qua giá trị rỗng, mà màn mặc định lọc
 * `escalated` — rỗng sẽ bị hiểu là "chưa chọn" và quay lại mặc định mỗi lần tải lại trang.
 */
export const ADMIN_RETURN_ALL = "all";
export const ADMIN_RETURN_DEFAULT_STATUS = "escalated";

export const ADMIN_RETURN_TABS = [
  { key: "escalated", label: "Chờ phân xử" },
  { key: "requested", label: "Shop đang duyệt" },
  { key: "approved", label: "Chờ nhận hàng" },
  { key: "received", label: "Đang hoàn tiền" },
  { key: "refunded", label: "Đã hoàn tiền" },
  { key: "rejected", label: "Đã từ chối" },
  { key: ADMIN_RETURN_ALL, label: "Tất cả" },
] as const;

/* Yêu cầu đang chờ SHOP: duyệt/từ chối (requested) hoặc xác nhận đã nhận hàng (approved + cần trả hàng; khách đã báo gửi thì gấp hơn). */
export function shopNeedsAction(r: Pick<ReturnRequestResponse, "status" | "requireReturn" | "shippedBackAt">): boolean {
  return r.status === "requested" || (r.status === "approved" && r.requireReturn && !!r.shippedBackAt);
}

/*
 * Nhãn trạng thái hiển thị của yêu cầu. Đơn COD "chưa nhận hàng" (COD-08b) kết thúc bằng ĐẢO GHI THU — khách chưa từng trả tiền mặt nên KHÔNG có khoản hoàn:
 * backend đặt `refunded` + `codReversed = true` (refundAmount = 0), nên "Đã hoàn tiền" sẽ nói sai sự thật; hiện "Đã đảo ghi thu COD".
 */
export function returnStatusMeta(r: Pick<ReturnRequestResponse, "status" | "codReversed">): StatusMeta {
  if (r.status === "refunded" && r.codReversed) return { label: "Đã đảo ghi thu COD", tone: "success" };
  return statusMeta(RETURN_STATUS, r.status);
}

/* "Áo thun +1 sản phẩm khác" — tóm tắt hàng trả cho dòng danh sách. */
export function returnItemSummary(r: Pick<ReturnRequestResponse, "items">): string {
  const first = r.items[0];
  if (!first) return "—";
  return `${first.name}${r.items.length > 1 ? ` +${r.items.length - 1} sản phẩm khác` : ""}`;
}
