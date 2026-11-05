"use client";

import { useRef } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { shippingControllerList, shippingControllerDetail, shippingControllerSimulate, shippingControllerConfirmCod } from "@/lib/api/generated/shipping/shipping";
import { invalidateByPath } from "@/lib/query-invalidate";
import type { ShipmentSummary } from "@/types/shipping";

const PATH = "/api/v1/admin/shipping/shipments";
export type SimulateEvent = "picked" | "in_transit" | "delivering" | "delivered" | "delivery_fail" | "returning" | "returned" | "cancel" | "lost";
export function useShipments(params: { page: number; size: number; q?: string; status?: string; shopId?: string }) {
  return useQuery({ queryKey: [PATH, params], queryFn: () => shippingControllerList(params), placeholderData: keepPreviousData, staleTime: 10_000 });
}
export function useShipment(id: string | null) {
  return useQuery<ShipmentSummary>({ queryKey: [`${PATH}/${id}`], queryFn: () => shippingControllerDetail(id!), enabled: !!id, staleTime: 10_000 });
}
export function useSimulateShipment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: { shipmentId: string; event: SimulateEvent }) => shippingControllerSimulate({ ...data, eventId: crypto.randomUUID() }), onSuccess: () => { invalidateByPath(qc, PATH, "/api/v1/admin/orders"); toast.success("Đã gửi sự kiện giả lập. Làm mới để xem kết quả xử lý."); } });
}
/* Giữ khoá qua lỗi mạng: retry cùng ý định xác nhận không thể tạo thêm khoản ghi thu. */
export function useConfirmCarrierCod(id: string) {
  const qc = useQueryClient();
  const key = useRef<string | null>(null);
  return useMutation({ mutationFn: (data: { amount: string; reference: string; note?: string }) => { key.current ??= crypto.randomUUID(); return shippingControllerConfirmCod(id, data, { headers: { "Idempotency-Key": key.current } }); }, onSuccess: () => { key.current = null; invalidateByPath(qc, PATH, "/api/v1/admin/orders", "/api/v1/admin/payments", "/api/v1/admin/payouts"); toast.success("Đã xác nhận tiền COD từ hãng về sàn."); } });
}
