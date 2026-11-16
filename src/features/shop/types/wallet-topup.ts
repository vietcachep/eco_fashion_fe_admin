/*
 * Nạp cọc ví qua PayOS (PLAN-0041). Chép từ hợp đồng PLAN-0041 §5.3 (eco_backend
 * `src/modules/payment/shop-wallet/dto/shop-wallet-topup.dto.ts` — file BE do WP-1 tạo; khi đổi DTO bên BE phải đổi file này).
 * Tiền là chuỗi số nguyên VND; thời gian ISO-8601.
 */

/* Khớp TOPUP_STATUS ở backend (7 trạng thái). */
export type TopupStatus = "creating" | "pending" | "partial" | "paid" | "expired" | "cancelled" | "failed";

/*
 * Khoản còn mở (đang tạo link, đang chờ tiền, đã nhận một phần). Khớp TOPUP_OPEN_STATUSES ở backend:
 * chỉ các trạng thái này còn cần hỏi PayOS và còn có thể huỷ.
 */
export const OPEN_TOPUP_STATUSES: readonly TopupStatus[] = ["creating", "pending", "partial"];

/* Khoản nạp cọc của gian hàng — vendor: GET /shop/wallet/topups*; sàn: GET /admin/wallet-topups*. */
export interface WalletTopup {
  id: string;
  shopId: string;
  shopName?: string;
  /* Số tiền yêu cầu, bằng số tiền của link PayOS. */
  amount: string;
  /* Tổng đã ghi có vào ví cho khoản này. */
  receivedAmount: string;
  status: TopupStatus;
  /* Mã PayOS để kế toán đối chiếu với bảng điều khiển PayOS. */
  payosOrderCode: string;
  /* Chỉ route vendor và chỉ khi status là pending|partial và chưa quá expiresAt; còn lại null. Sàn luôn null. */
  checkoutUrl: string | null;
  qrCode: string | null;
  expiresAt: string;
  paidAt: string | null;
  closedAt: string | null;
  createdAt: string;
  /* Vendor: status là pending|partial. */
  canCancel: boolean;
}

/* Trả về của POST /shop/wallet/topups. `reused` = đã có khoản còn mở và còn hạn nên trả lại khoản đó, không tạo link mới. */
export interface CreateTopupResult extends WalletTopup {
  reused: boolean;
}

export interface WalletTopupReceipt {
  reference: string;
  amount: string;
  createdAt: string;
}

/* Chi tiết dành cho sàn (GET /admin/wallet-topups/:id): thêm danh sách lần ghi có và kết quả đối chiếu PayOS gần nhất. */
export interface WalletTopupDetail extends WalletTopup {
  receipts: WalletTopupReceipt[];
  lastGatewayStatus: string | null;
  lastCheckedAt: string | null;
}

/*
 * Trường `payosTopup` của GET /shop/wallet (chỉ route vendor). `enabled` = cờ bật AND PayOS đã cấu hình AND EF_ADMIN_URL dùng được;
 * `active` = khoản còn mở và còn hạn của shop, không có thì null.
 */
/* Mã kỹ thuật vì sao nạp PayOS chưa mở (chép từ eco_backend shop-wallet-topup.types.ts TopupUnavailableReason). */
export type PayosTopupUnavailableReason = "flag_off" | "payos_not_configured" | "admin_url_invalid";

export interface PayosTopupInfo {
  enabled: boolean;
  /* null khi đã mở; backend cũ chưa có trường này thì undefined. */
  unavailableReason?: PayosTopupUnavailableReason | null;
  minAmount: number;
  maxAmount: number;
  active: WalletTopup | null;
}
