"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { shippingControllerHistory, shippingControllerLabel, shippingControllerReconcile, shippingControllerShip } from "@/lib/api/generated/shipping/shipping";
import { invalidateByPath } from "@/lib/query-invalidate";
import type { ShipmentSummary } from "@/types/shipping";

// PLAN-0043: hook feature bọc fetcher Orval; key theo URL để làm mới cùng dữ liệu đơn.
const path = (code: string) => `/api/v1/shop/orders/${encodeURIComponent(code)}`;
export function useOrderShipments(code: string, enabled: boolean) {
  return useQuery<ShipmentSummary[]>({ queryKey: [`${path(code)}/shipments`], queryFn: () => shippingControllerHistory(code), enabled, staleTime: 10_000 });
}
export function useOrderShippingAction(code: string, action: "ship" | "shipping/reconcile") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => action === "ship" ? shippingControllerShip(code) : shippingControllerReconcile(code),
    onSuccess: () => { invalidateByPath(qc, "/api/v1/shop/orders", "/api/v1/admin/shipping/shipments"); toast.success(action === "ship" ? "Đã gửi yêu cầu lấy hàng. Theo dõi xác nhận của hãng ở khung vận chuyển." : "Đã kiểm tra trạng thái vận chuyển."); },
    onError: () => invalidateByPath(qc, "/api/v1/shop/orders"),
  });
}
export function useOrderShippingLabel(code: string) {
  return useMutation({ mutationFn: () => shippingControllerLabel(code) });
}
