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

// PLAN-0043: tạo vận đơn và việc hãng lấy kiện là hai mốc riêng.
export const SHIPMENT_CREATE_STATUS: Record<string, StatusMeta> = {
  creating: { label: "Đang gửi yêu cầu lấy hàng", tone: "pending" },
  created: { label: "Hãng đã nhận yêu cầu", tone: "pending" },
  unknown: { label: "Đang xác minh với hãng", tone: "warning" },
  failed: { label: "Tạo vận đơn chưa thành công", tone: "danger" },
};
export const SHIPMENT_STATUS: Record<string, StatusMeta> = {
  awaiting_pickup: { label: "Chờ hãng lấy hàng", tone: "pending" },
  ready_to_pick: { label: "Chờ hãng lấy hàng", tone: "pending" },
  picking: { label: "Hãng đang đến lấy", tone: "pending" },
  picked: { label: "Đã bàn giao cho hãng", tone: "success" },
  in_transit: { label: "Đang vận chuyển", tone: "pending" },
  delivering: { label: "Đang giao đến khách", tone: "pending" },
  delivered: { label: "Đã giao thành công", tone: "success" },
  delivery_fail: { label: "Giao chưa thành công", tone: "warning" },
  delivery_failed: { label: "Giao chưa thành công", tone: "warning" },
  returning: { label: "Đang trả về shop", tone: "warning" },
  returned: { label: "Hàng đã trả về", tone: "neutral" },
  cancel: { label: "Hãng đã huỷ vận đơn", tone: "neutral" },
  cancelled: { label: "Đã huỷ vận đơn", tone: "neutral" },
  lost: { label: "Cần xử lý thất lạc", tone: "danger" },
};

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

// PLAN-0041: khoản nạp cọc ví qua PayOS (backend TOPUP_STATUS). Tông theo bảng §7.2 của plan.
export const TOPUP_STATUS: Record<string, StatusMeta> = {
  creating: { label: "Đang khởi tạo", tone: "pending" },
  pending: { label: "Chờ thanh toán", tone: "warning" },
  partial: { label: "Đã nhận một phần", tone: "warning" },
  paid: { label: "Đã nhận đủ", tone: "success" },
  expired: { label: "Hết hạn", tone: "neutral" },
  cancelled: { label: "Đã huỷ", tone: "neutral" },
  failed: { label: "Không tạo được", tone: "danger" },
};

/* Loại hoàn tiền: hoàn theo đơn (huỷ/đổi trả) khác hoàn khoản khách trả trùng — khoản trùng không đổi trạng thái thanh toán của đơn. */
export const REFUND_KIND: Record<string, StatusMeta> = {
  order: { label: "Hoàn theo đơn", tone: "neutral" },
  duplicate_payment: { label: "Thanh toán trùng", tone: "warning" },
  // PLAN-0040 6.2 (AUD-23): hoàn phần tiền lệch — khách trả thừa, hoặc trả thiếu rồi đơn huỷ; không đổi trạng thái thanh toán của đơn.
  mismatch: { label: "Tiền thanh toán lệch", tone: "warning" },
};

/*
 * Máy trạng thái đổi trả (backend RETURN_STATUS, PLAN-0022): shop duyệt/từ chối/nhận hàng, sàn chỉ phân xử `escalated`.
 * `approved` = shop đã duyệt, hàng CHƯA về (khách chưa/đang gửi); `received` = hàng đã về VÀ khoản hoàn đã được tạo bên payment.
 */
export const RETURN_STATUS: Record<string, StatusMeta> = {
  requested: { label: "Chờ shop duyệt", tone: "warning" },
  approved: { label: "Chờ nhận hàng trả", tone: "pending" },
  received: { label: "Đang hoàn tiền", tone: "pending" },
  refunded: { label: "Đã hoàn tiền", tone: "success" },
  rejected: { label: "Từ chối", tone: "danger" },
  escalated: { label: "Chờ sàn phân xử", tone: "warning" },
  cancelled: { label: "Khách đã rút", tone: "neutral" },
  expired: { label: "Hết hạn gửi hàng", tone: "neutral" },
};

/* Lý do khách chọn khi tạo yêu cầu (backend RETURN_REASON_LABEL). */
export const RETURN_REASON_LABEL: Record<string, string> = {
  defective: "Hàng bị lỗi",
  wrong_item: "Giao sai hàng",
  not_as_described: "Không đúng mô tả",
  damaged_shipping: "Hư hỏng khi vận chuyển",
  size_issue: "Không vừa kích cỡ",
  changed_mind: "Đổi ý, không muốn mua nữa",
  not_received: "Chưa nhận được hàng",
  other: "Lý do khác",
};

/* Vì sao yêu cầu lên sàn (`escalateSource`) — CSKH nhìn vào là biết ai cần giải trình. */
export const RETURN_ESCALATE_SOURCE_LABEL: Record<string, string> = {
  customer: "Khách khiếu nại sau khi shop từ chối",
  shop_timeout: "Shop quá hạn duyệt",
  shop_receive_timeout: "Shop quá hạn xác nhận nhận hàng",
  shop_not_matching: "Shop báo hàng trả không khớp",
};

/* Ngắn gọn cho cột bảng. */
export const RETURN_ESCALATE_SOURCE_SHORT: Record<string, string> = {
  customer: "Khách khiếu nại",
  shop_timeout: "Shop quá hạn duyệt",
  shop_receive_timeout: "Shop quá hạn nhận hàng",
  shop_not_matching: "Hàng không khớp",
};

/* Bước đang chờ và hạn của nó (`deadlineKind`). */
export const RETURN_DEADLINE_LABEL: Record<string, string> = {
  shop_respond: "Hạn shop duyệt / từ chối",
  ship_back: "Hạn khách gửi hàng trả",
  shop_receive: "Hạn shop xác nhận nhận hàng",
  escalate: "Hạn khách khiếu nại",
};

export const RETURN_RECEIVED_CONDITION_LABEL: Record<string, string> = {
  ok: "Đúng hàng",
  not_matching: "Không khớp",
};

export const RETURN_RESOLVE_DECISION_LABEL: Record<string, string> = {
  refund: "Hoàn tiền cho khách",
  reject: "Từ chối lần cuối",
};

/* Lý do shop báo giao không thành công (backend DELIVERY_FAILED_LABEL). */
export const DELIVERY_FAILED_REASON_LABEL: Record<string, string> = {
  refused: "Khách từ chối nhận hàng",
  unreachable: "Không liên lạc được với khách",
  wrong_address: "Sai địa chỉ / không tìm thấy địa chỉ giao",
  lost: "Hàng thất lạc trong vận chuyển",
  damaged: "Hàng hư hỏng trong vận chuyển",
  other: "Lý do khác",
};

// PLAN-0040 Tầng 3 — huỷ đơn & hạn chót (backend order.constants.ts: CANCEL_SOURCE_LABEL / CANCEL_REASON_LABEL / CANCEL_REQUEST_STATUS)
/* Ai huỷ đơn (`cancelledBy`). */
export const CANCELLED_BY_LABEL: Record<string, string> = {
  customer: "Khách hàng",
  shop: "Gian hàng",
  platform: "Sàn FITLY",
  system: "Hệ thống",
};

/* Mã lý do huỷ (`cancelReasonCode`) của cả bốn bên — một bảng vì đơn nào cũng chỉ có một mã. */
export const CANCEL_REASON_LABEL: Record<string, string> = {
  changed_mind: "Đổi ý, không muốn mua nữa",
  wrong_address: "Nhập sai địa chỉ / thông tin nhận hàng",
  found_cheaper: "Tìm được nơi bán giá tốt hơn",
  slow_confirm: "Shop xác nhận đơn quá chậm",
  out_of_stock: "Hết hàng",
  price_error: "Sai giá niêm yết",
  cannot_contact: "Không liên lạc được với khách",
  customer_request: "Theo yêu cầu của khách",
  dispute: "Tranh chấp",
  fraud: "Nghi ngờ gian lận",
  other: "Lý do khác",
  payment_expired: "Quá hạn thanh toán",
  shop_confirm_timeout: "Shop không xác nhận đơn đúng hạn",
  shop_ship_timeout: "Shop không giao hàng đúng hạn",
  shop_suspended: "Gian hàng bị tạm khoá",
};

/* Yêu cầu huỷ đơn đang đóng gói của khách (`cancelRequest.status`). */
export const CANCEL_REQUEST_STATUS: Record<string, StatusMeta> = {
  pending: { label: "Chờ shop xử lý", tone: "warning" },
  accepted: { label: "Shop đã chấp nhận", tone: "success" },
  rejected: { label: "Shop đã từ chối", tone: "danger" },
  auto_accepted: { label: "Tự chấp nhận (shop quá hạn)", tone: "neutral" },
};

/* Hãng vận chuyển (backend CARRIERS — danh mục cố định, `order.constants.ts`). */
export const CARRIER_LABEL: Record<string, string> = {
  ghn: "Giao Hàng Nhanh (GHN)",
  ghtk: "Giao Hàng Tiết Kiệm (GHTK)",
  viettel_post: "Viettel Post",
  jnt: "J&T Express",
  spx: "Shopee Express (SPX)",
  ahamove: "Ahamove",
  ninja_van: "Ninja Van",
  vnpost: "VNPost",
  other: "Hãng khác",
};

/* Khoản hoàn mới nhất của đơn (`order.refund`) — nhìn từ phía đơn hàng, không phải phía kế toán. */
export const ORDER_REFUND_STATUS: Record<string, StatusMeta> = {
  requested: { label: "Chờ hoàn tiền", tone: "pending" },
  processing: { label: "Đang hoàn tiền", tone: "pending" },
  failed: { label: "Hoàn tiền chưa thành công", tone: "warning" },
  done: { label: "Đã hoàn tiền", tone: "success" },
};

/*
 * PLAN-0040 6.2: cách chi khoản hoàn (`RefundResponse.method` = gateway | manual_transfer — KHÔNG phải mã phương thức thanh toán nên
 * không dùng `paymentMethodLabel`). Hoàn của đơn COD luôn là `manual_transfer`: tiền mặt chưa chắc đã thu nên không bao giờ tự chi.
 */
export const REFUND_METHOD_LABEL: Record<string, string> = {
  gateway: "Qua PayOS",
  manual_transfer: "Chuyển khoản tay",
};

/* Trạng thái lệnh chi PayOS của khoản hoàn (`gatewayStatus`); null = chưa gửi lệnh / hoàn tay. */
export const REFUND_GATEWAY_STATUS: Record<string, StatusMeta> = {
  submitted: { label: "PayOS đã nhận lệnh", tone: "pending" },
  processing: { label: "PayOS đang xử lý", tone: "pending" },
  succeeded: { label: "PayOS đã chuyển", tone: "success" },
  failed: { label: "PayOS báo lỗi", tone: "danger" },
};

/* Nguồn tài khoản nhận hoàn (`payeeSource`): ưu tiên tài khoản ĐÃ trả tiền, sau đó khách khai. */
export const REFUND_PAYEE_SOURCE_LABEL: Record<string, string> = {
  payer: "TK đã thanh toán",
  customer: "Khách khai",
  none: "Chưa có",
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

// PLAN-0040 5.2: xác minh tài khoản ngân hàng của shop (`bankStatus`). pending_verification = tên chủ TK lệch họ tên chủ shop,
// kỳ chi trả bị giữ tới khi quản lý sàn xác minh. `verified` gồm cả tên khớp lẫn quản lý đã xác minh tay (`bankVerifiedAt`).
export const SHOP_BANK_STATUS: Record<string, StatusMeta> = {
  verified: { label: "Đã xác minh", tone: "success" },
  pending_verification: { label: "Chờ sàn xác minh", tone: "warning" },
};

// PLAN-0040 6.4: loại điểm vi phạm xử lý đơn của shop. Màn hiện `kindLabel` do backend trả; bảng này chỉ cấp TÔNG màu + nhãn dự phòng
// (nhóm quá hạn = đỏ, nhóm shop tự huỷ/từ chối = vàng).
export const SHOP_VIOLATION_KIND: Record<string, StatusMeta> = {
  confirm_timeout: { label: "Quá hạn xác nhận đơn", tone: "danger" },
  ship_timeout: { label: "Quá hạn giao hàng", tone: "danger" },
  cancel_out_of_stock: { label: "Huỷ đơn vì hết hàng", tone: "warning" },
  cancel_price_error: { label: "Huỷ đơn vì sai giá", tone: "warning" },
  cancel_packing: { label: "Huỷ đơn đã đóng gói", tone: "warning" },
  reject_then_cancel: { label: "Từ chối yêu cầu huỷ của khách rồi tự huỷ đơn", tone: "warning" },
};

/* Kỳ đối soát (payout) — backend `PAYOUT_STATUS`: carried = net âm (không chi), settled = net 0. */
export const SHOP_PAYOUT_STATUS: Record<string, StatusMeta> = {
  pending: { label: "Chờ chi", tone: "warning" },
  processing: { label: "Đang chi", tone: "pending" },
  paid: { label: "Đã chi", tone: "success" },
  failed: { label: "Chi lỗi", tone: "danger" },
  // PLAN-0026
  awaiting_approval: { label: "Chờ duyệt", tone: "warning" },
  unknown: { label: "Không rõ kết quả — kiểm tra PayOS", tone: "danger" },
  held: { label: "Đang giữ", tone: "warning" },
  deferred: { label: "Chờ dồn kỳ sau (dưới mức tối thiểu)", tone: "neutral" },
  // PLAN-0040 6.2 (AUD-23): kỳ `deferred` đã được cộng sang kỳ sau — chỉ để tra cứu, không thao tác được.
  merged: { label: "Đã dồn sang kỳ sau", tone: "neutral" },
  carried: { label: "Mang nợ sang kỳ sau", tone: "neutral" },
  settled: { label: "Không phát sinh", tone: "neutral" },
};

/* PLAN-0040 6.2: kết quả lệnh chi PayOS của kỳ (`gatewayStatus`); null = chưa gửi lệnh / chi tay. */
export const PAYOUT_GATEWAY_STATUS: Record<string, StatusMeta> = {
  submitted: { label: "PayOS đã nhận lệnh", tone: "pending" },
  succeeded: { label: "PayOS đã chuyển", tone: "success" },
  failed: { label: "PayOS từ chối chắc chắn", tone: "danger" },
  not_received: { label: "PayOS chưa nhận lệnh", tone: "warning" },
  unknown: { label: "Không rõ kết quả", tone: "danger" },
};

/*
 * Cách nói RIÊNG cho vendor (cổng `/vendor/**`): backend che lỗi cổng chi với vendor (payout `failed` chỉ báo "sàn đang xử lý lại"),
 * Dựng từ bảng chung ở trên để không lặp mã/tông.
 */
export const VENDOR_PAYOUT_STATUS: Record<string, StatusMeta> = {
  ...SHOP_PAYOUT_STATUS,
  failed: { label: "Đang xử lý lại", tone: "warning" },
  // Vendor không cần biết chi tiết cổng: kỳ chưa rõ kết quả / chờ duyệt đều hiện là "đang xử lý".
  unknown: { label: "Đang xử lý", tone: "pending" },
  awaiting_approval: { label: "Đang xử lý", tone: "pending" },
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
  payos: "PayOS",
};

/* Dòng lịch sử có mã đã bị gỡ (vnpay / bank_transfer …) vẫn hiển thị được bằng nhãn chung. */
export function paymentMethodLabel(code?: string | null): string {
  if (!code) return "—";
  return PAYMENT_METHOD_LABEL[code] ?? "Phương thức cũ";
}

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
