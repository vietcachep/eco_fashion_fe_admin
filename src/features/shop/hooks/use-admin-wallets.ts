"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminWalletControllerAdjust,
  useAdminWalletControllerList,
  useAdminWalletControllerShopTransactions,
  useAdminWalletControllerShopWallet,
} from "@/lib/api/generated/admin-wallet/admin-wallet";
import type { AdjustWalletDto } from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";
import type { AdminWalletRow } from "@/features/shop/types/admin-shop";
import type { ShopWalletTransactionResponse } from "@/features/shop/types/shop-wallet";

/*
 * Ví quỹ COD của các shop (quyền supplier.wallet.*). Swagger không tả schema
 * response của hai endpoint danh sách (Orval sinh `void`) → ép kiểu `asPage<T>`
 * ở đây, điểm ép kiểu duy nhất. Ví + sổ cái của MỘT shop nằm dưới
 * `/admin/shops/:id/…`.
 */
const WALLETS_PATH = "/api/v1/admin/wallets";
const SHOPS_PATH = "/api/v1/admin/shops";
const DEPOSITS_PATH = "/api/v1/admin/wallet-deposits";

export function useAdminWallets(params: { lowOnly: boolean; page: number; size: number }) {
  return useAdminWalletControllerList(
    { lowOnly: params.lowOnly || undefined, page: params.page, size: params.size },
    {
      query: {
        select: (r) => asPage<AdminWalletRow>(r),
        placeholderData: keepPreviousData,
        staleTime: 15_000,
      },
    },
  );
}

export function useAdminShopWallet(shopId: string) {
  return useAdminWalletControllerShopWallet(shopId, { query: { enabled: !!shopId, staleTime: 15_000 } });
}

export function useAdminShopWalletTransactions(shopId: string, params: { page: number; size: number }) {
  return useAdminWalletControllerShopTransactions(shopId, params, {
    query: {
      enabled: !!shopId,
      select: (r) => asPage<ShopWalletTransactionResponse>(r),
      placeholderData: keepPreviousData,
      staleTime: 15_000,
    },
  });
}

/* Điều chỉnh ví: dương = cộng, âm = trừ; backend áp lại luật "ví ≤ 0 ⇒ khoá COD" theo số dư mới. */
export function useAdjustShopWallet(shopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdjustWalletDto) => adminWalletControllerAdjust(shopId, body),
    onSuccess: () => {
      invalidateByPath(qc, SHOPS_PATH, WALLETS_PATH, DEPOSITS_PATH);
      toast.success("Đã điều chỉnh ví — COD tự khoá/mở lại theo số dư mới.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Điều chỉnh ví thất bại.")),
  });
}
