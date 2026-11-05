"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminPaymentControllerPayee,
  adminPaymentControllerProcess,
  adminPaymentControllerRetryFinalize,
  adminPaymentControllerSetMethod,
  useAdminPaymentControllerGet,
  useAdminPaymentControllerList,
  useAdminPaymentControllerMethods,
  useAdminPaymentControllerRefunds,
} from "@/lib/api/generated/admin-payments/admin-payments";
import type { AdminPaymentControllerRefundsStatus, ProcessRefundRequest, RefundResponse } from "@/lib/api/generated/model";
import { apiErrorCode, apiErrorMessage, apiMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";
import type { PaymentMethodResponse, PaymentResponse } from "@/features/payment/types/payment";

/*
 * Thanh toán: giao dịch (COD / PayOS), hoàn tiền (PayOS hoặc ghi nhận chuyển tay),
 * bật/tắt phương thức. Sau hoàn tiền invalidate cả đơn hàng + đổi trả (yêu cầu `received` → `refunded`) + báo cáo.
 */
const PATH = "/api/v1/admin/payments";
const REFUNDS_PATH = "/api/v1/admin/refunds";
const METHODS_PATH = "/api/v1/admin/payment-methods";
const RELATED = ["/api/v1/admin/orders", "/api/v1/admin/returns", "/api/v1/admin/reports"];

export function useAdminPayments(params: { keyword?: string; status?: string; methodCode?: string; shopId?: string; page: number; size: number }) {
  return useAdminPaymentControllerList(
    {
      shopId: params.shopId || undefined,
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

export interface AdminRefundsQuery {
  status?: string;
  shopId?: string;
  /** true = chỉ khoản đang chờ kế toán chuyển khoản tay. */
  needsManual?: boolean;
  page: number;
  size: number;
}

export function useAdminRefunds({ status, shopId, needsManual, page, size }: AdminRefundsQuery) {
  return useAdminPaymentControllerRefunds(
    {
      status: (status || undefined) as AdminPaymentControllerRefundsStatus | undefined,
      shopId: shopId || undefined,
      needsManual: needsManual || undefined,
      page,
      size,
    },
    {
      query: {
        // Endpoint khai PageResponse trần (không generic) — điểm ép kiểu DUY NHẤT của danh sách; phần tử là RefundResponse.
        select: (r) => asPage<RefundResponse>(r),
        placeholderData: keepPreviousData,
        staleTime: 15_000,
      },
    },
  );
}

/* Mã lỗi backend khi mã giao dịch hoàn tay đã được dùng cho khoản hoàn khác (409, duy nhất toàn hệ thống). */
const PROVIDER_REF_DUPLICATE_CODE = "REFUND_PROVIDER_REF_DUPLICATE";

/*
 * PLAN-0040 AUD-14: khoản hoàn mà lệnh PayOS KHÔNG RÕ kết quả (`needsReconcile`) bị ghi sổ tay ⇒ 409 vì PayOS có thể đã chi (khách sẽ nhận hai lần).
 * Hai trường hợp dùng chung một mã, khác thông điệp: PayOS ĐÃ nhận lệnh (đừng chuyển tay — xử lý KHÔNG kèm mã để đối soát) · không tra được PayOS
 * (chỉ ghi sổ tay khi đã đối chiếu bảng điều khiển PayOS và lệnh CHƯA chạy ⇒ gửi `confirmGatewayNotExecuted`).
 */
const RECONCILE_REQUIRED_CODE = "PAYMENT_REFUND_RECONCILE_REQUIRED";

export function isRefundReconcileRequired(error: unknown): boolean {
  return apiErrorCode(error) === RECONCILE_REQUIRED_CODE;
}

/* Thông điệp lỗi cho hộp thoại hoàn tiền: mã trùng nói rõ như yêu cầu nghiệp vụ; lỗi định dạng / lỗi khác dùng câu của backend. */
export function processRefundErrorMessage(error: unknown, fallback: string): string {
  if (apiErrorCode(error) === PROVIDER_REF_DUPLICATE_CODE) return "Mã giao dịch đã được dùng cho khoản hoàn khác.";
  if (isRefundReconcileRequired(error)) {
    // Câu của backend đã nói rõ PayOS đã nhận lệnh hay chưa tra được; chỉ thêm lối ra khi backend không gửi câu nào.
    return apiMessage(error) ?? "Chưa rõ PayOS đã chi khoản này hay chưa. Bấm \"Đối soát theo lệnh PayOS\" (không nhập mã giao dịch) trước khi chuyển tay.";
  }
  return apiErrorMessage(error, fallback);
}

/* Báo kết quả theo trạng thái backend trả về: PayOS KHÔNG xong ngay — "đã nhận lệnh" chỉ là `processing`, nên chỉ báo "đã hoàn" khi trả `done`. */
function notifyRefundOutcome(refund: RefundResponse) {
  if (refund.status === "done") toast.success("Đã ghi nhận hoàn tiền xong.");
  else if (refund.status === "processing") {
    toast.info("Đang chờ PayOS xác nhận — PayOS đã nhận lệnh hoàn tiền. Khoản chỉ chuyển sang \"Đã hoàn\" khi PayOS báo chuyển thành công.");
  } else toast.error("Lệnh hoàn tiền chưa thành công — xem trạng thái ở danh sách; có thể chạy lại sau khi kiểm tra.");
}

/*
 * Xử lý khoản hoàn (PayOS tự chi hoặc ghi nhận chuyển tay kèm mã giao dịch). Lỗi hiện ngay trong hộp thoại đang mở (mã trùng,
 * sai định dạng…) — không toast.
 */
export function useProcessRefund(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProcessRefundRequest) => adminPaymentControllerProcess(id, body),
    onSuccess: (refund) => {
      invalidateByPath(qc, REFUNDS_PATH, PATH, ...RELATED);
      notifyRefundOutcome(refund);
    },
    onError: () => {
      // Thường do khoản vừa đổi trạng thái (đồng nghiệp xử lý trước / job đối soát) — đọc lại danh sách.
      invalidateByPath(qc, REFUNDS_PATH);
    },
  });
}

/*
 * Khoản PayOS ĐÃ nhận lệnh: bấm lại KHÔNG gửi lệnh thứ hai — backend tra trạng thái lệnh chi ngay (cùng endpoint xử lý, body rỗng).
 * Dùng cho nút "Kiểm tra PayOS" trên dòng bảng nên nhận id ở lúc gọi và báo lỗi bằng toast (không có hộp thoại).
 * Cũng là cách "Đối soát theo lệnh PayOS" cho khoản `needsReconcile` (lệnh PayOS không rõ kết quả): xử lý KHÔNG kèm providerRef để
 * backend tra / chạy lại đúng lệnh đã gửi (cùng khoá idempotency — không chi đôi) thay vì để kế toán chuyển tay.
 */
export function useCheckGatewayRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminPaymentControllerProcess(id, {}),
    onSuccess: (refund) => {
      invalidateByPath(qc, REFUNDS_PATH, PATH, ...RELATED);
      notifyRefundOutcome(refund);
    },
    onError: (e) => {
      invalidateByPath(qc, REFUNDS_PATH);
      toast.error(processRefundErrorMessage(e, "Không kiểm tra được trạng thái PayOS."));
    },
  });
}

/* Cổng ĐÃ chi nhưng ghi sổ lỗi: chỉ ghi sổ nốt, không gọi cổng lần hai (backend idempotent). */
export function useRetryFinalizeRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminPaymentControllerRetryFinalize(id),
    onSuccess: () => {
      invalidateByPath(qc, REFUNDS_PATH, PATH, ...RELATED);
      toast.success("Đã hoàn tất ghi sổ hoàn tiền.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Ghi sổ hoàn tiền thất bại.")),
  });
}

/*
 * Xem SỐ TÀI KHOẢN ĐẦY ĐỦ nhận hoàn (GET /admin/refunds/{id}/payee) để chuyển khoản tay. Dữ liệu nhạy cảm, mỗi lần xem backend ghi audit:
 * dùng mutation (không phải query) để chỉ gọi khi người dùng chủ động bấm — không tự refetch / không nằm trong cache truy vấn — và
 * `gcTime: 0` để kết quả không lưu lại sau khi hộp thoại gọi `reset()` lúc đóng. Không đưa vào URL, không log.
 */
export function useRevealRefundPayee() {
  return useMutation({
    mutationFn: (id: string) => adminPaymentControllerPayee(id),
    gcTime: 0,
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
