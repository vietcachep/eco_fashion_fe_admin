"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  shopReturnControllerApprove,
  shopReturnControllerReceive,
  shopReturnControllerReject,
  useShopReturnControllerGet,
  useShopReturnControllerList,
} from "@/lib/api/generated/shop-returns/shop-returns";
import type {
  ApproveReturnRequest,
  ReceiveReturnRequest,
  RejectReturnRequest,
  ShopReturnControllerListStatus,
  ShopReturnRequestResponse,
} from "@/lib/api/generated/model";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";

/*
 * Đổi trả — cổng SHOP (/shop/returns/**, PLAN-0022). `shopId` do backend suy từ phiên nên không có tham số shop; yêu cầu của shop
 * khác ⇒ 404. Shop là bên DUYỆT / TỪ CHỐI / XÁC NHẬN NHẬN HÀNG; quá hạn thì hệ thống tự chuyển sàn.
 *
 * Sau mutation làm mới: đổi trả, đơn của shop (đơn về `returned`), kho (nhập lại hàng khi nhận đúng), báo cáo + đối soát
 * (yêu cầu mở chặn đối soát; hoàn tiền trừ vào kỳ chi trả). Lỗi nghiệp vụ hiện ngay trong hộp thoại đang mở (ApiErrorState),
 * hook chỉ đọc lại dữ liệu vì thường do đồng nghiệp / hệ thống đã đổi trạng thái trước.
 */
const RETURNS_PATH = "/api/v1/shop/returns";
const RELATED = ["/api/v1/shop/orders", "/api/v1/shop/inventory", "/api/v1/shop/reports", "/api/v1/shop/payouts", "/api/v1/shop/wallet"];

export interface ShopReturnsQuery {
  status?: string;
  page: number;
  size: number;
}

export function useShopReturns({ status, page, size }: ShopReturnsQuery) {
  return useShopReturnControllerList(
    { status: (status || undefined) as ShopReturnControllerListStatus | undefined, page, size },
    {
      query: {
        // Endpoint khai PageResponse trần (không generic) — điểm ép kiểu DUY NHẤT của danh sách.
        select: (r) => asPage<ShopReturnRequestResponse>(r),
        placeholderData: keepPreviousData,
        staleTime: 15_000,
      },
    },
  );
}

export function useShopReturn(id: string) {
  return useShopReturnControllerGet(id, { query: { enabled: !!id, staleTime: 10_000 } });
}

/*
 * Duyệt: yêu cầu cần trả hàng ⇒ `approved` (khách nhận địa chỉ gửi trả); "chưa nhận hàng" ⇒ hoàn tiền ngay (`received`), không nhập kho. Riêng đơn COD
 * đã báo giao (khách chưa từng trả tiền) ⇒ `refunded` + `codReversed`: đảo ghi thu COD, KHÔNG tạo khoản hoàn (làm mới thêm ví cọc COD của shop).
 */
export function useApproveReturn(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ApproveReturnRequest) => shopReturnControllerApprove(id, body),
    onSuccess: (r) => {
      invalidateByPath(qc, RETURNS_PATH, ...RELATED);
      toast.success(
        r.status === "approved"
          ? "Đã duyệt — khách nhận địa chỉ gửi trả và có thời hạn để gửi hàng về."
          : r.codReversed
            ? "Đã duyệt — đơn COD khách chưa trả tiền nên hệ thống đảo ghi thu, không hoàn tiền."
            : "Đã duyệt — yêu cầu hoàn tiền đã chuyển cho kế toán.",
      );
    },
    onError: () => {
      invalidateByPath(qc, RETURNS_PATH);
    },
  });
}

/* Từ chối: khách được khiếu nại lên sàn trong hạn; lý do + minh chứng của shop là căn cứ để sàn phân xử. */
export function useRejectReturn(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RejectReturnRequest) => shopReturnControllerReject(id, body),
    onSuccess: () => {
      invalidateByPath(qc, RETURNS_PATH, ...RELATED);
      toast.success("Đã từ chối yêu cầu — khách nhận được lý do của shop.");
    },
    onError: () => {
      invalidateByPath(qc, RETURNS_PATH);
    },
  });
}

/* Đã nhận hàng: `ok` ⇒ nhập kho + yêu cầu hoàn tiền; `not_matching` ⇒ chuyển sàn phân xử (chưa nhập kho, chưa hoàn). */
export function useReceiveReturn(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReceiveReturnRequest) => shopReturnControllerReceive(id, body),
    onSuccess: (r) => {
      invalidateByPath(qc, RETURNS_PATH, ...RELATED);
      toast.success(
        r.status === "escalated"
          ? "Đã báo hàng không khớp — yêu cầu chuyển lên sàn phân xử."
          : "Đã xác nhận nhận hàng — hàng được nhập kho và yêu cầu hoàn tiền đã chuyển cho kế toán.",
      );
    },
    onError: () => {
      invalidateByPath(qc, RETURNS_PATH);
    },
  });
}
