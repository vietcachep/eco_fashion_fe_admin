"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminWalletControllerApprove,
  adminWalletControllerReject,
  useAdminWalletControllerDeposits,
} from "@/lib/api/generated/admin-wallet/admin-wallet";
import type { AdminWalletControllerDepositsStatus, DepositRequestResponse } from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";

/*
 * Yêu cầu nộp quỹ COD của shop (quyền supplier.wallet.read / adjust). Duyệt cộng
 * ví và có thể mở lại COD → làm mới cả ví lẫn thông tin shop
 * (`/admin/shops/:id/wallet`).
 */
const DEPOSITS_PATH = "/api/v1/admin/wallet-deposits";
const RELATED = ["/api/v1/admin/wallets", "/api/v1/admin/shops"];

export function useAdminDeposits(params: { status?: string; page: number; size: number }) {
  return useAdminWalletControllerDeposits(
    {
      status: (params.status || undefined) as AdminWalletControllerDepositsStatus | undefined,
      page: params.page,
      size: params.size,
    },
    {
      query: {
        select: (r) => asPage<DepositRequestResponse>(r),
        placeholderData: keepPreviousData,
        staleTime: 15_000,
      },
    },
  );
}

export function useApproveDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; note?: string }) => adminWalletControllerApprove(v.id, { note: v.note || undefined }),
    onSuccess: () => {
      invalidateByPath(qc, DEPOSITS_PATH, ...RELATED);
      toast.success("Đã cộng ví — COD được mở lại nếu ví > 0.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Duyệt yêu cầu nộp quỹ thất bại.")),
  });
}

export function useRejectDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; note: string }) => adminWalletControllerReject(v.id, { note: v.note }),
    onSuccess: () => {
      invalidateByPath(qc, DEPOSITS_PATH, ...RELATED);
      toast.success("Đã từ chối yêu cầu nộp quỹ.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Từ chối yêu cầu thất bại.")),
  });
}
