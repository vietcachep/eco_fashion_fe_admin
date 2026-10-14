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

/* Loại hoàn tiền: hoàn theo đơn (huỷ/đổi trả) khác hoàn khoản khách trả trùng — khoản trùng không đổi trạng thái thanh toán của đơn. */
export const REFUND_KIND: Record<string, StatusMeta> = {
  order: { label: "Hoàn theo đơn", tone: "neutral" },
  duplicate_payment: { label: "Thanh toán trùng", tone: "warning" },
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

/* Loại biến động sổ kho — backend ghi IN HOA (STOCK_MOVE ở product.constants.ts). */
export const STOCK_MOVEMENT_TYPE: Record<string, StatusMeta> = {
  RECEIPT: { label: "Nhập kho", tone: "success" },
  ADJUST: { label: "Điều chỉnh", tone: "pending" },
  RESERVE: { label: "Giữ cho đơn", tone: "warning" },
  RELEASE: { label: "Nhả giữ", tone: "neutral" },
  SALE: { label: "Bán (trừ kho)", tone: "pending" },
  RETURN: { label: "Hoàn kho", tone: "neutral" },
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

/* Trạng thái gian hàng (module `shop`, backend `SHOP_STATUS`). Nhãn khớp tab lọc ở màn sàn. */
export const SHOP_STATUS: Record<string, StatusMeta> = {
  pending: { label: "Chờ duyệt", tone: "warning" },
  approved: { label: "Đang hoạt động", tone: "success" },
  suspended: { label: "Tạm khoá", tone: "danger" },
  rejected: { label: "Từ chối", tone: "neutral" },
};

/* Kỳ đối soát (payout) — backend `PAYOUT_STATUS`: carried = net âm (không chi), settled = net 0. */
export const SHOP_PAYOUT_STATUS: Record<string, StatusMeta> = {
  pending: { label: "Chờ chi", tone: "warning" },
  processing: { label: "Đang chi", tone: "pending" },
  paid: { label: "Đã chi", tone: "success" },
  failed: { label: "Chi lỗi", tone: "danger" },
  carried: { label: "Mang nợ sang kỳ sau", tone: "neutral" },
  settled: { label: "Không phát sinh", tone: "neutral" },
};

/* Loại dòng sổ cái ví quỹ COD — backend `WALLET_TX_TYPE`. */
export const WALLET_TX_TYPE_LABEL: Record<string, StatusMeta> = {
  cod_commission: { label: "Hoa hồng đơn COD", tone: "warning" },
  deposit: { label: "Nộp quỹ", tone: "success" },
  adjust: { label: "Điều chỉnh", tone: "pending" },
  cod_refund: { label: "Hoàn tiền đơn COD", tone: "neutral" },
};

/* Yêu cầu nộp quỹ COD của shop. */
export const DEPOSIT_STATUS: Record<string, StatusMeta> = {
  pending: { label: "Chờ duyệt", tone: "warning" },
  approved: { label: "Đã duyệt", tone: "success" },
  rejected: { label: "Từ chối", tone: "danger" },
};

/*
 * Cách nói RIÊNG cho vendor (cổng `/vendor/**`): backend che lỗi cổng chi với vendor (payout `failed` chỉ báo "sàn đang xử lý lại"),
 * và dòng điều chỉnh ví luôn do sàn thực hiện nên nói rõ "bởi sàn". Dựng từ bảng chung ở trên để không lặp mã/tông.
 */
export const VENDOR_PAYOUT_STATUS: Record<string, StatusMeta> = {
  ...SHOP_PAYOUT_STATUS,
  failed: { label: "Đang xử lý lại", tone: "warning" },
};

export const VENDOR_WALLET_TX_TYPE_LABEL: Record<string, StatusMeta> = {
  ...WALLET_TX_TYPE_LABEL,
  adjust: { label: "Điều chỉnh bởi sàn", tone: "pending" },
};

export const SHOP_MEMBER_ROLE_LABEL: Record<string, string> = {
  shop_owner: "Chủ gian hàng",
  shop_staff: "Nhân viên shop",
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
  payos: "PayOS",
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

/* Phạm vi mã giảm giá (backend `promotion.scope`): sàn chịu giảm giá hay gian hàng chịu. */
export const PROMOTION_SCOPE_LABEL: Record<string, string> = {
  platform: "Toàn sàn",
  shop: "Gian hàng",
};

/* Giai đoạn của mã theo isActive + thời gian hiệu lực (suy ở FE — backend không trả sẵn). */
export const PROMOTION_PHASE: Record<string, StatusMeta> = {
  running: { label: "Đang chạy", tone: "success" },
  upcoming: { label: "Sắp diễn ra", tone: "pending" },
  expired: { label: "Hết hạn", tone: "warning" },
  off: { label: "Đang tắt", tone: "neutral" },
};

export const DOCUMENT_KIND_LABEL: Record<string, string> = {
  policy: "Chính sách",
  faq: "FAQ",
  guide: "Hướng dẫn",
  product: "Sản phẩm",
};

/*
 * Kiểu nhập của thuộc tính động (backend DYNAMIC_INPUT_TYPES). Màu KHÔNG phải một kiểu riêng:
 * "Màu sắc" là thuộc tính `select` có giá trị mang `extra.hex`.
 */
export const DYNAMIC_INPUT_TYPE: Record<string, StatusMeta> = {
  select: { label: "Lựa chọn", tone: "pending" },
  text: { label: "Văn bản", tone: "neutral" },
  number: { label: "Số", tone: "warning" },
};

/* Chế độ thuộc tính của ngành hàng (backend `category.attributeMode`). */
export const ATTRIBUTE_MODE: Record<string, StatusMeta> = {
  dynamic: { label: "Thuộc tính động", tone: "success" },
  legacy_fashion: { label: "Thời trang cũ", tone: "neutral" },
};

/* Tra nhãn/tông theo mã; mã lạ → hiện mã thô với tông trung tính. */
export function statusMeta(map: Record<string, StatusMeta>, code?: string | null): StatusMeta {
  if (!code) return { label: "—", tone: "neutral" };
  return map[code] ?? { label: code, tone: "neutral" };
}
