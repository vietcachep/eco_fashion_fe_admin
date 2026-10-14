/*
 * DTO sổ cái ví quỹ COD mà Orval KHÔNG sinh được (GET /shop/wallet/transactions khai response `void` — controller
 * không gắn @ApiOkResponse). Chép từ `eco_backend/src/modules/payment/shop-wallet/dto/shop-wallet.responses.ts`
 * (ShopWalletTransactionResponse). Swagger chỉ liệt kê 3 loại nhưng service còn ghi `cod_refund`
 * (WALLET_TX_TYPE trong payment.constants) nên khai đủ 4.
 */
export type ShopWalletTransactionType = "cod_commission" | "deposit" | "adjust" | "cod_refund";

export interface ShopWalletTransactionResponse {
  id: string;
  type: ShopWalletTransactionType | string;
  /** VND, chuỗi số nguyên: âm = trừ ví (hoa hồng, hoàn tiền), dương = cộng ví (nộp quỹ, điều chỉnh). */
  amount: string;
  /** Số dư ví SAU giao dịch (VND). */
  balanceAfter: string;
  /** Mã đơn (hoa hồng COD) — với `cod_refund` là mã dòng hoàn tiền RF-…, đơn gốc nằm trong `note`. */
  orderCode: string | null;
  note: string | null;
  createdAt: string;
}
