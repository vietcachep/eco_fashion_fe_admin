/* Ví đặt cọc COD (PLAN-0020) — khớp DTO backend `shop-wallet.dto.ts`; tiền là chuỗi số nguyên VND (ví có thể ÂM). */

export type DepositStatus = "pending" | "approved" | "rejected";
export type WalletTxType = "deposit" | "cod_commission" | "cod_refund" | "adjust";

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

export interface DepositRequestInput {
  amount: string;
  transferRef: string;
  note?: string;
}
