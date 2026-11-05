"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminReturnControllerResolve,
  useAdminReturnControllerGet,
  useAdminReturnControllerList,
} from "@/lib/api/generated/admin-returns/admin-returns";
import type {
  AdminReturnControllerListStatus,
  ResolveReturnRequest,
  ReturnRequestResponse,
} from "@/lib/api/generated/model";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";

/*
 * Đổi trả — cổng SÀN (/admin/returns, PLAN-0022). Sàn KHÔNG duyệt thay shop: hàng đợi của CSKH là các yêu cầu `escalated`
 * (khách khiếu nại / shop quá hạn / shop báo hàng không khớp) và hành động duy nhất là phân xử (`resolve`).
 * Phân xử có thể nhập kho (nếu shop đã nhận hàng) và sinh yêu cầu hoàn tiền nên làm mới cả đơn, hoàn tiền, kho, báo cáo.
 */
const RETURNS_PATH = "/api/v1/admin/returns";
const RELATED = ["/api/v1/admin/orders", "/api/v1/admin/refunds", "/api/v1/admin/payments", "/api/v1/admin/inventory", "/api/v1/admin/reports", "/api/v1/admin/wallets"];

export interface AdminReturnsQuery {
  status?: string;
  shopId?: string;
  page: number;
  size: number;
}

export function useAdminReturns({ status, shopId, page, size }: AdminReturnsQuery) {
  return useAdminReturnControllerList(
    { status: (status || undefined) as AdminReturnControllerListStatus | undefined, shopId: shopId || undefined, page, size },
    {
      query: {
        // Endpoint khai PageResponse trần (không generic) — điểm ép kiểu DUY NHẤT của danh sách.
        select: (r) => asPage<ReturnRequestResponse>(r),
        placeholderData: keepPreviousData,
        staleTime: 15_000,
      },
    },
  );
}

export function useAdminReturn(id: string) {
  return useAdminReturnControllerGet(id, { query: { enabled: !!id, staleTime: 10_000 } });
}

/* Lỗi nghiệp vụ (ORDER_RETURN_INVALID_STATE, ORDER_RETURN_REFUND_TOO_HIGH…) hiện ngay trong hộp thoại đang mở — không toast. */
export function useResolveReturn(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ResolveReturnRequest) => adminReturnControllerResolve(id, body),
    onSuccess: (r, body) => {
      invalidateByPath(qc, RETURNS_PATH, ...RELATED);
      toast.success(
        body.decision !== "refund"
          ? "Đã phân xử: từ chối lần cuối."
          : r.codReversed
            ? "Đã phân xử: đơn COD khách chưa trả tiền nên hệ thống đảo ghi thu, không hoàn tiền."
            : "Đã phân xử: hoàn tiền cho khách — yêu cầu hoàn tiền đã chuyển cho kế toán.",
      );
    },
    // Thường do đồng nghiệp đã xử lý trước (409) — đọc lại để màn hiện đúng trạng thái.
    onError: () => {
      invalidateByPath(qc, RETURNS_PATH);
    },
  });
}
