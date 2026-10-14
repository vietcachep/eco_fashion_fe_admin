"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  shopWalletControllerCreateDeposit,
  useShopWalletControllerDeposits,
  useShopWalletControllerSummary,
  useShopWalletControllerTransactions,
} from "@/lib/api/generated/shop-wallet/shop-wallet";
import type { CreateDepositRequestDto, DepositRequestResponse } from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";
import type { ShopWalletTransactionResponse } from "@/features/shop/types/shop-wallet";

/*
 * Ví quỹ COD của gian hàng CỦA CHÍNH MÌNH (vendor, quyền shop.wallet.*). Hoa hồng đơn COD trừ vào ví khi đơn hoàn tất;
 * ví ≤ 0 thì backend khoá COD của shop, nộp quỹ (sàn duyệt) hoặc sàn điều chỉnh làm ví > 0 thì mở lại.
 */
const WALLET_PATH = "/api/v1/shop/wallet";

export function useMyShopWallet() {
  return useShopWalletControllerSummary({ query: { staleTime: 30_000 } });
}

/* Sổ cái ví (mới nhất trước). Orval khai response `void` → ép về trang có kiểu ngay trong `select` (điểm ép kiểu duy nhất). */
export function useMyShopWalletTransactions(params: { page: number; size: number }) {
  return useShopWalletControllerTransactions(params, {
    query: {
      select: (r) => asPage<ShopWalletTransactionResponse>(r),
      placeholderData: keepPreviousData,
      staleTime: 15_000,
    },
  });
}

/* Lịch sử yêu cầu nộp quỹ của shop. */
export function useMyShopDepositRequests(params: { page: number; size: number }) {
  return useShopWalletControllerDeposits(params, {
    query: {
      select: (r) => asPage<DepositRequestResponse>(r),
      placeholderData: keepPreviousData,
      staleTime: 15_000,
    },
  });
}

/* Một yêu cầu chờ duyệt mỗi lúc — gửi khi đang có yêu cầu pending thì backend trả 409, thông báo hiện nguyên văn. */
export function useCreateDepositRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDepositRequestDto) => shopWalletControllerCreateDeposit(body),
    onSuccess: () => {
      invalidateByPath(qc, WALLET_PATH);
      toast.success("Đã gửi yêu cầu nộp quỹ — chờ sàn duyệt.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Gửi yêu cầu nộp quỹ thất bại.")),
  });
}
