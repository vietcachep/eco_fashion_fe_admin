import type { ShopResponse } from "@/lib/api/generated/model";

/*
 * DTO phía SÀN mà Swagger không tả schema response (Orval sinh `void`) — chép từ
 * backend `eco_backend/src/modules/payment/shop-wallet/dto/shop-wallet.responses.ts`
 * (AdminWalletRowResponse). Dòng sổ cái dùng chung kiểu `ShopWalletTransactionResponse` ở types/shop-wallet.ts. Tiền luôn là chuỗi số
 * nguyên VND. Hook của feature ép kiểu qua `asPage<T>()` đúng một chỗ.
 */

/** Một dòng ở `GET /admin/wallets` — ví quỹ COD của một shop. */
export interface AdminWalletRow {
  shopId: string;
  shopName: string | null;
  /** Số dư quỹ COD (VND); ≤ 0 ⇒ COD bị khoá. */
  balance: string;
  codEnabled: boolean;
  updatedAt: string;
}

/* Phần của gian hàng mà hộp thoại thao tác (duyệt / khoá / hoa hồng) cần — `ShopResponse` và `AdminShopResponse` đều khớp. */
export type ShopActionTarget = Pick<ShopResponse, "id" | "name" | "status" | "commissionRate">;
