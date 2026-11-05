import type { StatusTone } from "@/components/shared/status-badge";
import type { DepositStatus, WalletTxType } from "@/features/shop/types/wallet";

/* Nhãn ví đặt cọc COD dùng chung cổng sàn + vendor (khớp WALLET_TX_TYPE / DEPOSIT_STATUS của backend). */
export const WALLET_TX_LABEL: Record<WalletTxType, string> = {
  deposit: "Nộp cọc",
  cod_commission: "Hoa hồng đơn COD",
  cod_refund: "Hoàn tiền đơn COD",
  adjust: "Sàn chỉnh ví",
  // PLAN-0040 Tầng 3.6: dương = trả lại hoa hồng đã trừ; âm = thu lại phần voucher sàn đã bù (ngược dấu `cod_commission` của đơn).
  cod_reversal: "Đảo ghi thu COD",
  // PLAN-0041: tiền tự ghi có khi chủ shop nạp cọc qua PayOS — luôn dương, không cần sàn duyệt tay.
  topup_payos: "Nạp cọc qua PayOS",
};

export const DEPOSIT_STATUS_META: Record<DepositStatus, { label: string; tone: StatusTone }> = {
  pending: { label: "Chờ sàn duyệt", tone: "pending" },
  approved: { label: "Đã duyệt", tone: "success" },
  rejected: { label: "Đã từ chối", tone: "danger" },
};
