"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  shopPayoutControllerMarkPaid,
  shopPayoutControllerRetry,
  shopPayoutControllerRun,
  useShopPayoutControllerDetail,
  useShopPayoutControllerList,
  useShopPayoutControllerPayosBalance,
} from "@/lib/api/generated/payouts/payouts";
import type {
  MarkPaidRequest,
  RunPayoutRequest,
  ShopPayoutControllerListStatus,
  ShopPayoutResponse,
} from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";

/*
 * Đối soát (payout) của MỌI shop (quyền supplier.payout.read / process): xem kỳ,
 * chạy kỳ, gửi lại lệnh chi PayOS, đánh dấu đã chi. Prefix `/admin/payouts` phủ cả
 * danh sách, chi tiết lẫn số dư PayOS (đổi sau khi gửi lệnh chi).
 */
const PATH = "/api/v1/admin/payouts";

export function useAdminPayouts(params: { status?: string; shopId?: string; page: number; size: number }) {
  return useShopPayoutControllerList(
    {
      status: (params.status || undefined) as ShopPayoutControllerListStatus | undefined,
      shopId: params.shopId || undefined,
      page: params.page,
      size: params.size,
    },
    {
      query: {
        select: (r) => asPage<ShopPayoutResponse>(r),
        placeholderData: keepPreviousData,
        staleTime: 15_000,
      },
    },
  );
}

export function useAdminPayoutDetail(id: string) {
  return useShopPayoutControllerDetail(id, { query: { enabled: !!id, staleTime: 10_000 } });
}

/* Số dư tài khoản chi PayOS; `configured: false` ⇒ chưa có khoá lệnh chi, kế toán chuyển tay. */
export function usePayosBalance() {
  return useShopPayoutControllerPayosBalance({ query: { staleTime: 60_000 } });
}

/*
 * Chạy kỳ đối soát toàn sàn (idempotent). Trả danh sách kỳ vừa tạo để dialog hiện
 * tóm tắt nên KHÔNG toast thành công ở đây; lỗi nghiệp vụ (PAYOUT_PERIOD_OVERLAP,
 * PAYOUT_INVALID_PERIOD…) → toast tiếng Việt từ backend.
 */
export function useRunPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RunPayoutRequest) => shopPayoutControllerRun(body),
    onSuccess: () => invalidateByPath(qc, PATH),
    onError: (e) => toast.error(apiErrorMessage(e, "Chạy kỳ đối soát thất bại.")),
  });
}

export function useRetryPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shopPayoutControllerRetry(id),
    onSuccess: () => {
      invalidateByPath(qc, PATH);
      toast.success("Đã gửi lại lệnh chi.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Gửi lại lệnh chi thất bại.")),
  });
}

export function useMarkPayoutPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string } & MarkPaidRequest) =>
      shopPayoutControllerMarkPaid(v.id, { providerRef: v.providerRef, note: v.note || undefined }),
    onSuccess: () => {
      invalidateByPath(qc, PATH);
      toast.success("Đã đánh dấu đã chi.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Đánh dấu đã chi thất bại.")),
  });
}
