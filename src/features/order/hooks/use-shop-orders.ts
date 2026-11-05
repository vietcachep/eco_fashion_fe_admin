"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  shopOrderControllerAcceptCancelRequest,
  shopOrderControllerCancel,
  shopOrderControllerDeliveryFailed,
  shopOrderControllerExtendShip,
  shopOrderControllerGoodsReturned,
  shopOrderControllerRejectCancelRequest,
  shopOrderControllerUpdateStatus,
  useShopOrderControllerGet,
  useShopOrderControllerList,
  useShopOrderControllerSummary,
} from "@/lib/api/generated/shop-orders/shop-orders";
import { useShopReportingControllerDashboard } from "@/lib/api/generated/shop-reports/shop-reports";
import type {
  DeliveryFailedRequest,
  OrderResponse,
  ShopCancelOrderRequest,
  ShopOrderControllerListStatus,
  ShopReasonRequest,
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
 * Lỗi nghiệp vụ (ORDER_INVALID_TRANSITION, ORDER_CANNOT_CANCEL, ORDER_SHIP_*,
 * ORDER_CANCEL_REQUEST_NOT_FOUND…) KHÔNG toast ở đây — dialog hiện ngay trong
 * khung đang mở; hook chỉ làm mới đơn vì thường là do đồng nhân viên / hệ thống
 * đã đổi trạng thái trước (khách rút yêu cầu, job tự chấp nhận quá hạn…).
 */
const ORDERS_PATH = "/api/v1/shop/orders";
const RELATED_PATHS = ["/api/v1/shop/reports", "/api/v1/shop/inventory"];
// PLAN-0040 3.1: huỷ có thể ghi điểm vi phạm (bất đồng bộ qua outbox, vài giây) — làm mới luôn màn điểm vi phạm của shop.
const VIOLATIONS_PATH = "/api/v1/shop/violations";

export interface ShopOrdersQuery {
  keyword?: string;
  status?: string;
  page: number;
  size: number;
}

/* Danh sách đơn con của shop. Backend lọc theo `status` + `q` (mã đơn, tên / SĐT người nhận). */
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
  shipping: "Đã giao cho vận chuyển — khách nhận thông báo kèm hãng và mã vận đơn.",
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

/*
 * Shop huỷ đơn (quyền shop.order.cancel): chờ xác nhận · đã xác nhận · ĐANG ĐÓNG GÓI. Gửi MÃ lý do (+ ghi chú) — backend ghép nhãn, và quyết
 * định có +1 điểm vi phạm hay không. Nếu khách đang có yêu cầu huỷ chờ duyệt thì việc huỷ này chốt luôn yêu cầu đó.
 */
export function useShopCancelOrder(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ShopCancelOrderRequest) => shopOrderControllerCancel(code, body),
    onSuccess: (order) => {
      invalidateByPath(qc, ORDERS_PATH, VIOLATIONS_PATH, ...RELATED_PATHS);
      toast.success(order.status === "cancelled" ? "Đã huỷ đơn — hàng giữ được nhả về kho, thanh toán (nếu có) chuyển sang hoàn tiền." : "Đã gửi yêu cầu huỷ. Hệ thống đang chờ hãng xác nhận trước khi hoàn tiền hoặc nhập kho.");
    },
    onError: () => {
      invalidateByPath(qc, ORDERS_PATH);
    },
  });
}

/*
 * Chấp nhận yêu cầu huỷ của khách (đơn đang đóng gói): huỷ đơn + nhập lại kho + hoàn tiền nếu đã trả, KHÔNG tính điểm vi phạm.
 * 409 ORDER_CANCEL_REQUEST_NOT_FOUND = không còn yêu cầu chờ (khách rút / job đã tự chấp nhận) — hộp thoại hiện câu của backend.
 */
export function useShopAcceptCancelRequest(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => shopOrderControllerAcceptCancelRequest(code),
    onSuccess: () => {
      invalidateByPath(qc, ORDERS_PATH, ...RELATED_PATHS);
      toast.success("Đã chấp nhận yêu cầu huỷ — đơn được huỷ, hàng nhập lại kho, thanh toán (nếu có) chuyển sang hoàn tiền.");
    },
    onError: () => {
      invalidateByPath(qc, ORDERS_PATH);
    },
  });
}

/* Từ chối yêu cầu huỷ: đơn tiếp tục xử lý, khách đọc lý do. Sau đó shop tự huỷ đơn này sẽ bị +1 điểm vi phạm. */
export function useShopRejectCancelRequest(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ShopReasonRequest) => shopOrderControllerRejectCancelRequest(code, body),
    onSuccess: () => {
      invalidateByPath(qc, ORDERS_PATH);
      toast.success("Đã từ chối yêu cầu huỷ — khách nhận được lý do của shop, đơn tiếp tục được xử lý.");
    },
    onError: () => {
      invalidateByPath(qc, ORDERS_PATH);
    },
  });
}

/* Gia hạn giao hàng MỘT lần (quyền shop.order.update). Lỗi 409 ORDER_SHIP_* hiện câu của backend trong hộp thoại. */
export function useShopExtendShip(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ShopReasonRequest) => shopOrderControllerExtendShip(code, body),
    onSuccess: () => {
      invalidateByPath(qc, ORDERS_PATH);
      toast.success("Đã gia hạn thời gian giao hàng cho đơn này.");
    },
    onError: () => {
      invalidateByPath(qc, ORDERS_PATH);
    },
  });
}

/*
 * Báo đơn ĐANG GIAO giao không thành công (khách từ chối / không liên lạc được / sai địa chỉ / thất lạc / hư hỏng / khác): đơn → huỷ,
 * `goodsReturned` ⇒ nhập kho lại, đơn đã thu tiền online ⇒ hoàn ĐỦ cho khách. Làm mới thêm đối soát (đơn huỷ rời kỳ chi trả) — RELATED_PATHS
 * đã có kho + báo cáo.
 */
export function useShopDeliveryFailed(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DeliveryFailedRequest) => shopOrderControllerDeliveryFailed(code, body),
    onSuccess: (_o, body) => {
      invalidateByPath(qc, ORDERS_PATH, "/api/v1/shop/returns", "/api/v1/shop/payouts", ...RELATED_PATHS);
      toast.success(
        body.goodsReturned
          ? "Đã ghi nhận giao không thành công — đơn được huỷ và hàng đã nhập kho lại."
          : "Đã ghi nhận giao không thành công — đơn được huỷ. Khi hàng về tới shop, bấm \"Hàng đã về kho\" để nhập kho.",
      );
    },
    onError: () => {
      invalidateByPath(qc, ORDERS_PATH);
    },
  });
}

/*
 * "Hàng đã về kho" cho đơn huỷ vì giao thất bại mà lúc báo chưa nhận lại hàng: nhập kho đúng số đã giao, ĐÚNG MỘT LẦN, trong 30 ngày kể từ lúc báo.
 * Lỗi (400 ORDER_GOODS_RETURN_NOT_ALLOWED · 409 ORDER_GOODS_ALREADY_RETURNED · 409 quá 30 ngày) hiện câu của backend trong hộp thoại.
 */
export function useShopGoodsReturned(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => shopOrderControllerGoodsReturned(code),
    onSuccess: () => {
      invalidateByPath(qc, ORDERS_PATH, ...RELATED_PATHS);
      toast.success("Đã ghi nhận hàng về kho — tồn kho được cộng lại.");
    },
    onError: () => {
      invalidateByPath(qc, ORDERS_PATH);
    },
  });
}
