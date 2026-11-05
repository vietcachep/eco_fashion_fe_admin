"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { customInstance } from "@/lib/api/mutator";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";
import type { ShopWallet, WalletDeposit, WalletSummary, WalletTransaction } from "@/features/shop/types/wallet";

/*
 * Ví đặt cọc COD (PLAN-0020). Gọi thẳng qua mutator vì client Orval sinh từ spec trước khi có các route này
 * (chạy `npm run api:sync` sẽ sinh bản có kiểu — khi đó có thể đổi sang hook sinh ra).
 * Vendor: /shop/wallet* (shopId từ ngữ cảnh). Sàn: /admin/wallets, /admin/wallet-deposits*, /admin/shops/:id/wallet*.
 */
const SHOP_PATH = "/api/v1/shop/wallet";
const ADMIN_PATHS = ["/api/v1/admin/wallets", "/api/v1/admin/wallet-deposits", "/api/v1/admin/shops"];

const get = <T>(url: string, params?: Record<string, unknown>) => customInstance<T>({ url, method: "GET", params });
const post = <T>(url: string, data?: unknown) => customInstance<T>({ url, method: "POST", data });

// ---------------------------------------------------------------- vendor

export function useMyWallet() {
  return useQuery({ queryKey: [SHOP_PATH], queryFn: () => get<ShopWallet>(SHOP_PATH), staleTime: 10_000 });
}

export function useMyWalletTransactions(page: number, size: number) {
  return useQuery({
    queryKey: [`${SHOP_PATH}/transactions`, page, size],
    queryFn: () => get<unknown>(`${SHOP_PATH}/transactions`, { page, size }),
    select: (r) => asPage<WalletTransaction>(r),
    placeholderData: keepPreviousData,
  });
}

// ---------------------------------------------------------------- sàn

export function useAdminWallets(params: { lowOnly: boolean; page: number; size: number }) {
  return useQuery({
    queryKey: ["/api/v1/admin/wallets", params],
    queryFn: () => get<unknown>("/api/v1/admin/wallets", { lowOnly: params.lowOnly || undefined, page: params.page, size: params.size }),
    select: (r) => asPage<WalletSummary>(r),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useAdminDeposits(params: { status?: string; page: number; size: number }) {
  return useQuery({
    queryKey: ["/api/v1/admin/wallet-deposits", params],
    queryFn: () => get<unknown>("/api/v1/admin/wallet-deposits", { status: params.status || undefined, page: params.page, size: params.size }),
    select: (r) => asPage<WalletDeposit>(r),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

function useAdminWalletMutation<TVars>(fn: (v: TVars) => Promise<unknown>, success: string, failure: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      invalidateByPath(qc, ...ADMIN_PATHS);
      toast.success(success);
    },
    onError: (e) => toast.error(apiErrorMessage(e, failure)),
  });
}

export const useApproveDeposit = () =>
  useAdminWalletMutation((id: string) => post(`/api/v1/admin/wallet-deposits/${id}/approve`), "Đã duyệt khoản nộp cọc.", "Duyệt khoản nộp cọc thất bại.");

export const useRejectDeposit = () =>
  useAdminWalletMutation(
    (v: { id: string; reason: string }) => post(`/api/v1/admin/wallet-deposits/${v.id}/reject`, { reason: v.reason }),
    "Đã từ chối khoản nộp cọc.",
    "Từ chối khoản nộp cọc thất bại.",
  );

export const useAdjustWallet = () =>
  useAdminWalletMutation(
    (v: { shopId: string; amount: string; note: string }) => post(`/api/v1/admin/shops/${v.shopId}/wallet/adjust`, { amount: v.amount, note: v.note }),
    "Đã chỉnh ví.",
    "Chỉnh ví thất bại.",
  );
