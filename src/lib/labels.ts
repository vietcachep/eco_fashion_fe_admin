import type { StatusTone } from "@/components/shared/status-badge";

/*
 * Nhãn tiếng Việt + tông màu cho MÃ TRẠNG THÁI backend (chuỗi thường, khai ở
 * `src/modules/<m>/foundation/*.constants.ts`). Gom một chỗ vì nhiều feature
 * cùng hiện (đơn hàng ở dashboard, thanh toán ở đơn…). Thiếu mã → hiện mã thô,
 * không vỡ.
 */
export interface StatusMeta {
  label: string;
  tone: StatusTone;
}

export const ORDER_STATUS: Record<string, StatusMeta> = {
  pending: { label: "Chờ xác nhận", tone: "warning" },
  confirmed: { label: "Đã xác nhận", tone: "pending" },
  packing: { label: "Đang đóng gói", tone: "pending" },
  shipping: { label: "Đang giao", tone: "pending" },
  delivered: { label: "Đã giao", tone: "success" },
  completed: { label: "Hoàn tất", tone: "success" },
  cancelled: { label: "Đã huỷ", tone: "danger" },
  returned: { label: "Đã trả hàng", tone: "neutral" },
};

export const ORDER_PAYMENT_STATUS: Record<string, StatusMeta> = {
  unpaid: { label: "Chưa thanh toán", tone: "warning" },
  processing: { label: "Đang xử lý", tone: "pending" },
  paid: { label: "Đã thanh toán", tone: "success" },
  refunded: { label: "Đã hoàn tiền", tone: "neutral" },
  partially_refunded: { label: "Hoàn một phần", tone: "neutral" },
};

export const PAYMENT_STATUS: Record<string, StatusMeta> = {
  pending: { label: "Chờ thanh toán", tone: "warning" },
  processing: { label: "Đang xử lý", tone: "pending" },
  paid: { label: "Đã thanh toán", tone: "success" },
  failed: { label: "Thất bại", tone: "danger" },
  expired: { label: "Hết hạn", tone: "neutral" },
  cancelled: { label: "Đã huỷ", tone: "neutral" },
  refunded: { label: "Đã hoàn tiền", tone: "neutral" },
  partially_refunded: { label: "Hoàn một phần", tone: "neutral" },
};

export const REFUND_STATUS: Record<string, StatusMeta> = {
  requested: { label: "Chờ xử lý", tone: "warning" },
  processing: { label: "Đang xử lý", tone: "pending" },
  done: { label: "Đã hoàn", tone: "success" },
  failed: { label: "Thất bại", tone: "danger" },
};

export const RETURN_STATUS: Record<string, StatusMeta> = {
  requested: { label: "Chờ duyệt", tone: "warning" },
  approved: { label: "Đã duyệt", tone: "pending" },
  rejected: { label: "Từ chối", tone: "danger" },
  refunded: { label: "Đã hoàn tiền", tone: "success" },
};

export const PRODUCT_STATUS: Record<string, StatusMeta> = {
  draft: { label: "Nháp", tone: "neutral" },
  active: { label: "Đang bán", tone: "success" },
  hidden: { label: "Đã ẩn", tone: "warning" },
};

export const USER_STATUS: Record<string, StatusMeta> = {
  pending_verification: { label: "Chờ xác minh", tone: "warning" },
  active: { label: "Hoạt động", tone: "success" },
  locked: { label: "Đã khoá", tone: "danger" },
  deleted: { label: "Đã xoá", tone: "neutral" },
};

export const RECEIPT_STATUS: Record<string, StatusMeta> = {
  draft: { label: "Nháp", tone: "neutral" },
  posted: { label: "Đã nhập kho", tone: "success" },
  cancelled: { label: "Đã huỷ", tone: "danger" },
};

export const REVIEW_STATUS: Record<string, StatusMeta> = {
  pending: { label: "Chờ duyệt", tone: "warning" },
  approved: { label: "Hiển thị", tone: "success" },
  hidden: { label: "Đã ẩn", tone: "neutral" },
};

export const CONTACT_STATUS: Record<string, StatusMeta> = {
  new: { label: "Mới", tone: "warning" },
  handled: { label: "Đã trả lời", tone: "success" },
};

export const SUPPORT_STATUS: Record<string, StatusMeta> = {
  open: { label: "Mới", tone: "warning" },
  in_progress: { label: "Đang xử lý", tone: "pending" },
  resolved: { label: "Đã đóng", tone: "success" },
};

export const AI_INDEX_STATUS: Record<string, StatusMeta> = {
  pending: { label: "Chờ nhúng", tone: "warning" },
  ready: { label: "Sẵn sàng", tone: "success" },
  failed: { label: "Lỗi", tone: "danger" },
};

export const MODERATION_LABEL: Record<string, StatusMeta> = {
  ok: { label: "Bình thường", tone: "success" },
  spam: { label: "Spam", tone: "warning" },
  toxic: { label: "Độc hại", tone: "danger" },
  off_topic: { label: "Lạc đề", tone: "neutral" },
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cod: "COD",
  bank_transfer: "Chuyển khoản",
  vnpay: "VNPay",
  card: "Thẻ",
};

export const ORDER_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(ORDER_STATUS).map(([k, v]) => [k, v.label]),
);

export const GENDER_LABEL: Record<string, string> = {
  nam: "Nam",
  nu: "Nữ",
  unisex: "Unisex",
};

export const PROMO_TYPE_LABEL: Record<string, string> = {
  percentage: "Giảm theo %",
  fixed_amount: "Giảm số tiền",
  free_shipping: "Miễn phí vận chuyển",
};

export const APPLIES_TO_LABEL: Record<string, string> = {
  all: "Toàn bộ đơn",
  category: "Theo ngành hàng",
  product: "Theo sản phẩm",
};

export const DOCUMENT_KIND_LABEL: Record<string, string> = {
  policy: "Chính sách",
  faq: "FAQ",
  guide: "Hướng dẫn",
  product: "Sản phẩm",
};

/* Tra nhãn/tông theo mã; mã lạ → hiện mã thô với tông trung tính. */
export function statusMeta(map: Record<string, StatusMeta>, code?: string | null): StatusMeta {
  if (!code) return { label: "—", tone: "neutral" };
  return map[code] ?? { label: code, tone: "neutral" };
}
