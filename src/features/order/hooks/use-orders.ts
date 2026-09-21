"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminOrderControllerCancel,
  adminOrderControllerReturnProcess,
  adminOrderControllerStatus,
  useAdminOrderControllerGet,
  useAdminOrderControllerList,
  useAdminOrderControllerReturnGet,
  useAdminOrderControllerReturnsList,
} from "@/lib/api/generated/admin-orders/admin-orders";
import type {
  ProcessReturnRequest,
  ReturnRequestResponse,
  UpdateOrderStatusRequest,
} from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";
import type { OrderSummaryResponse } from "@/features/order/types/order";

/*
 * Đơn hàng + đổi trả (khu quản trị). Đổi trạng thái đi lưới STAFF_TRANSITIONS
 * của backend (xem types/order.ts); huỷ thay khách chỉ ở pending/confirmed.
 * Sau mutation invalidate cả đơn, đổi trả, thanh toán (huỷ đơn có thể sinh
 * hoàn tiền) và tồn kho (nhả / trừ hàng giữ).
 */
const PATH = "/api/v1/admin/orders";
const RETURNS_PATH = "/api/v1/admin/returns";
const RELATED = ["/api/v1/admin/payments", "/api/v1/admin/refunds", "/api/v1/admin/inventory", "/api/v1/admin/reports"];

export interface AdminOrdersQuery {
  keyword?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethodCode?: string;
  page: number;
  size: number;
}

export function useAdminOrders({ keyword, status, paymentStatus, paymentMethodCode, page, size }: AdminOrdersQuery) {
  return useAdminOrderControllerList(
    {
      q: keyword || undefined,
      status: (status || undefined) as never,
      paymentStatus: paymentStatus || undefined,
      paymentMethodCode: paymentMethodCode || undefined,
      page,
      size,
    },
    {
      query: {
        select: (r) => asPage<OrderSummaryResponse>(r),
        placeholderData: keepPreviousData,
        staleTime: 15_000,
      },
    },
  );
}

export function useAdminOrder(code: string) {
  return useAdminOrderControllerGet(code, { query: { enabled: !!code, staleTime: 10_000 } });
}

export function useUpdateOrderStatus(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateOrderStatusRequest) => adminOrderControllerStatus(code, body),
    onSuccess: () => {
      invalidateByPath(qc, PATH, ...RELATED);
      toast.success("Đã cập nhật trạng thái đơn.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Cập nhật trạng thái thất bại.")),
  });
}

export function useCancelOrder(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => adminOrderControllerCancel(code, { reason }),
    onSuccess: () => {
      invalidateByPath(qc, PATH, ...RELATED);
      toast.success("Đã huỷ đơn — hàng giữ được nhả, thanh toán (nếu có) chuyển sang hoàn tiền.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Huỷ đơn thất bại.")),
  });
}

export function useAdminReturns(params: { status?: string; page: number; size: number }) {
  return useAdminOrderControllerReturnsList(
    { status: (params.status || undefined) as never, page: params.page, size: params.size },
    {
      query: {
        select: (r) => asPage<ReturnRequestResponse>(r),
        placeholderData: keepPreviousData,
        staleTime: 15_000,
      },
    },
  );
}

export function useAdminReturn(id: string) {
  return useAdminOrderControllerReturnGet(id, { query: { enabled: !!id, staleTime: 10_000 } });
}

export function useProcessReturn(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProcessReturnRequest) => adminOrderControllerReturnProcess(id, body),
    onSuccess: (_r, body) => {
      invalidateByPath(qc, RETURNS_PATH, PATH, ...RELATED);
      toast.success(body.decision === "approved" ? "Đã duyệt đổi trả — yêu cầu hoàn tiền được tạo." : "Đã từ chối yêu cầu.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Xử lý đổi trả thất bại.")),
  });
}
