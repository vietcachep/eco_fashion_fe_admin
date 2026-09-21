"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminPaymentControllerConfirm,
  adminPaymentControllerProcess,
  adminPaymentControllerSetMethod,
  useAdminPaymentControllerGet,
  useAdminPaymentControllerList,
  useAdminPaymentControllerMethods,
  useAdminPaymentControllerRefunds,
} from "@/lib/api/generated/admin-payments/admin-payments";
import type { ConfirmTransferRequest, ProcessRefundRequest } from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";
import type { PaymentMethodResponse, PaymentResponse, RefundResponse } from "@/features/payment/types/payment";

/*
 * Thanh toán: giao dịch (COD / chuyển khoản / VNPay), đối soát chuyển khoản
 * (kế toán xác nhận tiền đã về → đơn được xác nhận), hoàn tiền (VNPay API
 * hoặc ghi nhận chuyển tay), bật/tắt phương thức. Sau đối soát / hoàn tiền
 * invalidate cả đơn hàng + báo cáo.
 */
const PATH = "/api/v1/admin/payments";
const REFUNDS_PATH = "/api/v1/admin/refunds";
const METHODS_PATH = "/api/v1/admin/payment-methods";
const RELATED = ["/api/v1/admin/orders", "/api/v1/admin/reports"];

export function useAdminPayments(params: { keyword?: string; status?: string; methodCode?: string; page: number; size: number }) {
  return useAdminPaymentControllerList(
    {
      q: params.keyword || undefined,
      status: (params.status || undefined) as never,
      methodCode: (params.methodCode || undefined) as never,
      page: params.page,
      size: params.size,
    },
    {
      query: {
        select: (r) => asPage<PaymentResponse>(r),
        placeholderData: keepPreviousData,
        staleTime: 15_000,
      },
    },
  );
}

export function useAdminPayment(id: string) {
  return useAdminPaymentControllerGet(id, {
    query: { enabled: !!id, select: (r) => r as unknown as PaymentResponse, staleTime: 10_000 },
  });
}

export function useConfirmTransfer(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ConfirmTransferRequest) => adminPaymentControllerConfirm(id, body),
    onSuccess: () => {
      invalidateByPath(qc, PATH, ...RELATED);
      toast.success("Đã xác nhận chuyển khoản — đơn chuyển sang đã thanh toán.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Xác nhận chuyển khoản thất bại.")),
  });
}

export function useAdminRefunds(params: { status?: string; page: number; size: number }) {
  return useAdminPaymentControllerRefunds(
    { status: (params.status || undefined) as never, page: params.page, size: params.size },
    {
      query: {
        select: (r) => asPage<RefundResponse>(r),
        placeholderData: keepPreviousData,
        staleTime: 15_000,
      },
    },
  );
}

export function useProcessRefund(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProcessRefundRequest) => adminPaymentControllerProcess(id, body),
    onSuccess: () => {
      invalidateByPath(qc, REFUNDS_PATH, PATH, ...RELATED);
      toast.success("Đã hoàn tiền.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Hoàn tiền thất bại.")),
  });
}

export function usePaymentMethods() {
  return useAdminPaymentControllerMethods({
    query: { select: (r) => r as unknown as PaymentMethodResponse[], staleTime: 60_000 },
  });
}

export function useSetMethodActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, isActive }: { code: string; isActive: boolean }) => adminPaymentControllerSetMethod(code, { isActive }),
    onSuccess: (_r, v) => {
      invalidateByPath(qc, METHODS_PATH, "/api/v1/payment-methods");
      toast.success(v.isActive ? "Đã bật phương thức." : "Đã tắt phương thức.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Cập nhật phương thức thất bại.")),
  });
}
