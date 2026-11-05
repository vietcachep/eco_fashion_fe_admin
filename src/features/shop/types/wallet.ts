/* Ví đặt cọc COD (PLAN-0020) — khớp DTO backend `shop-wallet.dto.ts`; tiền là chuỗi số nguyên VND (ví có thể ÂM). */

import type { PayosTopupInfo } from "@/features/shop/types/wallet-topup";

export type DepositStatus = "pending" | "approved" | "rejected";
// PLAN-0040 Tầng 3.6: `cod_reversal` = đảo ghi thu COD khi khách báo chưa nhận hàng (ngược dấu dòng `cod_commission` của cùng đơn).
// PLAN-0041: topup_payos = nạp cọc qua PayOS tự ghi có vào ví, luôn dương (khớp CHECK chk_shop_cod_wallet_tx_type của migration PLAN-0041).
export type WalletTxType = "deposit" | "cod_commission" | "cod_refund" | "adjust" | "cod_reversal" | "topup_payos";

export interface WalletDeposit {
  id: string;
  shopId: string;
  shopName?: string;
  amount: string;
  transferRef: string;
  note: string | null;
  status: DepositStatus;
  rejectReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface ShopWallet {
  shopId: string;
  shopName?: string;
  balance: string;
  codEnabled: boolean;
  exempt: boolean;
  pendingDeposit: WalletDeposit | null;
  minDeposit: number;
  instructions: string;
  // PLAN-0041: chỉ route vendor (GET /shop/wallet) trả trường này; màn sàn không có.
  payosTopup?: PayosTopupInfo;
}

export interface WalletSummary {
  shopId: string;
  shopName?: string;
  balance: string;
  codEnabled: boolean;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  type: WalletTxType;
  amount: string;
  balanceAfter: string;
  orderCode: string | null;
  note: string | null;
  createdAt: string;
}
