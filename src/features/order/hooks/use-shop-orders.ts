"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  shopOrderControllerCancel,
  shopOrderControllerUpdateStatus,
  useShopOrderControllerGet,
  useShopOrderControllerList,
  useShopOrderControllerSummary,
} from "@/lib/api/generated/shop-orders/shop-orders";
import { useShopReportingControllerDashboard } from "@/lib/api/generated/shop-reports/shop-reports";
import type {
  OrderResponse,
  ShopOrderControllerListStatus,
  ShopUpdateOrderStatusRequest,
} from "@/lib/api/generated/model";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";
import type { OrderSummaryResponse } from "@/features/order/types/order";
import type { OrderVoucher, ShopOrderDetail } from "@/features/order/types/shop-order";

/*
 * Đơn hàng của GIAN HÀNG mình (cổng nhà cung cấp, /shop/orders/**). shopId do
 * backend suy từ JWT nên không có tham số shop nào ở đây.
 *
 * Sau mutation làm mới: đơn (danh sách + số đếm theo tab + chi tiết), báo cáo
 * (doanh thu / việc chờ xử lý) và kho (xác nhận trừ kho thật, huỷ nhả hàng giữ).
 * Lỗi nghiệp vụ (ORDER_INVALID_TRANSITION, ORDER_CANNOT_CANCEL…) KHÔNG toast ở
 * đây — dialog hiện ngay trong khung đang mở; hook chỉ làm mới đơn vì thường
 * là do đồng nhân viên đã đổi trạng thái trước.
 */
const ORDERS_PATH = "/api/v1/shop/orders";
const RELATED_PATHS = ["/api/v1/shop/reports", "/api/v1/shop/inventory"];

export interface ShopOrdersQuery {
  keyword?: string;
  status?: string;
  page: number;
  size: number;
}

/* Danh sách đơn con của shop. Backend chỉ lọc theo `status` + `q` (mã đơn, tên / SĐT người nhận). */
export function useShopOrders({ keyword, status, page, size }: ShopOrdersQuery) {
  return useShopOrderControllerList(
    {
      q: keyword || undefined,
      status: (status || undefined) as ShopOrderControllerListStatus | undefined,
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

/* Số đơn theo từng trạng thái — hiện cạnh tab lọc. */
export function useShopOrderSummary() {
  return useShopOrderControllerSummary({ query: { staleTime: 15_000 } });
}

/*
 * Số đơn "cần xử lý ngay" (chờ xác nhận VÀ là COD / đã thanh toán) — backend chỉ
 * tính con số này ở báo cáo dashboard nên bọc endpoint đó tại đây thay vì
 * import hook của feature reporting. Cùng khoá cache với dashboard nên không
 * thêm request khi dashboard đã mở.
 */
export function useShopAwaitingConfirmCount() {
  return useShopReportingControllerDashboard({
    query: { staleTime: 60_000, select: (d) => d.pending.awaitingConfirm },
  });
}

/* Backend mới trả {code,name}, spec cũ khai chuỗi mã — chấp cả hai (xem ShopOrderDetail). */
function toVoucher(raw: unknown): OrderVoucher | null {
  if (!raw) return null;
  if (typeof raw === "string") return { code: raw, name: null };
  const v = raw as { code?: unknown; name?: unknown };
  if (typeof v.code !== "string") return null;
  return { code: v.code, name: typeof v.name === "string" ? v.name : null };
}

/* Điểm ép kiểu DUY NHẤT của chi tiết đơn. */
function toShopOrderDetail(o: OrderResponse): ShopOrderDetail {
  return { ...o, promotion: toVoucher(o.promotion), shopPromotion: toVoucher(o.shopPromotion) };
}

export function useShopOrder(code: string) {
  return useShopOrderControllerGet(code, {
    query: { enabled: !!code, staleTime: 10_000, select: toShopOrderDetail },
  });
}

const STATUS_SUCCESS: Record<ShopUpdateOrderStatusRequest["status"], string> = {
  confirmed: "Đã xác nhận đơn — hàng được trừ kho, khách nhận thông báo.",
  packing: "Đã chuyển sang đóng gói.",
  shipping: "Đã giao cho vận chuyển — khách nhận thông báo.",
  delivered: "Đã đánh dấu giao thành công.",
};

export function useShopUpdateOrderStatus(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ShopUpdateOrderStatusRequest) => shopOrderControllerUpdateStatus(code, body),
    onSuccess: (_o, body) => {
      invalidateByPath(qc, ORDERS_PATH, ...RELATED_PATHS);
      toast.success(STATUS_SUCCESS[body.status]);
    },
    onError: () => {
      invalidateByPath(qc, ORDERS_PATH);
    },
  });
}

export function useShopCancelOrder(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => shopOrderControllerCancel(code, { reason }),
    onSuccess: () => {
      invalidateByPath(qc, ORDERS_PATH, ...RELATED_PATHS);
      toast.success("Đã huỷ đơn — hàng giữ được nhả về kho, thanh toán (nếu có) chuyển sang hoàn tiền.");
    },
    onError: () => {
      invalidateByPath(qc, ORDERS_PATH);
    },
  });
}
