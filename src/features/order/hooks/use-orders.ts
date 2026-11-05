"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminOrderControllerCancel,
  useAdminOrderControllerGet,
  useAdminOrderControllerList,
} from "@/lib/api/generated/admin-orders/admin-orders";
import type { AdminCancelOrderRequest, AdminOrderControllerListStatus } from "@/lib/api/generated/model";
import { apiErrorCode, apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";
import type { OrderSummaryResponse } from "@/features/order/types/order";

/*
 * Đơn hàng (khu quản trị). Sàn CHỈ giám sát: xác nhận / đóng gói / giao là việc của chủ shop (cổng vendor). Sàn huỷ được
 * đơn chưa giao cho vận chuyển và — khi tranh chấp — cả đơn ĐÓNG GÓI / ĐANG GIAO (bắt buộc lý do ≥ 10 ký tự; đang giao thì không tự
 * nhập kho). Tìm đơn TOÀN SÀN không cần chọn shop (PLAN-0040 4.2): `q` khớp mã đơn con DH…, mã nhóm DHN…, email khách (nhập đủ), tên / SĐT
 * người nhận. Đổi trả có hook riêng (use-returns.ts).
 * Sau huỷ làm mới cả đơn, thanh toán (huỷ đơn đã thu tiền sinh hoàn tiền), đổi trả (không được huỷ khi còn yêu cầu mở), tồn kho và báo cáo.
 */
const PATH = "/api/v1/admin/orders";
const RELATED = ["/api/v1/admin/payments", "/api/v1/admin/refunds", "/api/v1/admin/returns", "/api/v1/admin/inventory", "/api/v1/admin/reports"];

export interface AdminOrdersQuery {
  keyword?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethodCode?: string;
  shopId?: string;
  page: number;
  size: number;
}

export function useAdminOrders({ keyword, status, paymentStatus, paymentMethodCode, shopId, page, size }: AdminOrdersQuery) {
  return useAdminOrderControllerList(
    {
      q: keyword || undefined,
      status: (status || undefined) as AdminOrderControllerListStatus | undefined,
      paymentStatus: paymentStatus || undefined,
      paymentMethodCode: paymentMethodCode || undefined,
      shopId: shopId || undefined,
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

/* Mã lỗi backend khi đơn còn yêu cầu đổi trả đang mở — không huỷ được cho tới khi yêu cầu đó xử lý xong. */
const OPEN_RETURN_CODE = "ORDER_HAS_OPEN_RETURN";

/*
 * Thông điệp lỗi huỷ đơn cho hộp thoại. `ORDER_HAS_OPEN_RETURN` nói rõ việc cần làm (xử lý yêu cầu đổi trả trước); lỗi khác dùng câu của backend.
 */
export function cancelOrderErrorMessage(error: unknown, fallback: string): string {
  if (apiErrorCode(error) === OPEN_RETURN_CODE) {
    return "Đơn đang có yêu cầu đổi trả chưa xử lý xong nên chưa huỷ được. Hãy xử lý (phân xử / chờ shop xử lý) yêu cầu đổi trả của đơn này trước, rồi huỷ đơn.";
  }
  return apiErrorMessage(error, fallback);
}

/* Lỗi nghiệp vụ hiện ngay trong hộp thoại đang mở (xem CancelOrderDialog) — không toast; chỉ đọc lại đơn vì thường do trạng thái vừa đổi. */
export function useCancelOrder(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminCancelOrderRequest) => adminOrderControllerCancel(code, body),
    onSuccess: () => {
      invalidateByPath(qc, PATH, ...RELATED);
      toast.success("Đã huỷ đơn. Nếu khách đã thanh toán online, yêu cầu hoàn tiền đã được chuyển cho kế toán.");
    },
    onError: () => {
      invalidateByPath(qc, PATH);
    },
  });
}
