"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { shopControllerMe, shopControllerUpdateMe } from "@/lib/api/generated/shops/shops";
import { shippingControllerProvinces, shippingControllerDistricts, shippingControllerWards } from "@/lib/api/generated/shipping/shipping";
import { invalidateByPath } from "@/lib/query-invalidate";
import type { PickupAddress, ShippingLocation } from "@/types/shipping";

export interface ShopShippingSettings { shippingCarrierEnabled: boolean; shippingPickup: PickupAddress | null; shippingReturn: PickupAddress | null }
export function useShopShippingSettings() {
  return useQuery({ queryKey: ["/api/v1/shop/me"], queryFn: () => shopControllerMe(), select: (shop): ShopShippingSettings => ({ shippingCarrierEnabled: shop.shippingCarrierEnabled ?? false, shippingPickup: shop.shippingPickup ?? null, shippingReturn: shop.shippingReturn ?? null }), staleTime: 60_000 });
}
export function useSaveShopShipping() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: ShopShippingSettings) => shopControllerUpdateMe({ shippingCarrierEnabled: data.shippingCarrierEnabled, shippingPickup: data.shippingPickup ?? undefined, shippingReturn: data.shippingReturn ?? undefined }), onSuccess: () => { invalidateByPath(qc, "/api/v1/shop/me"); toast.success("Đã lưu địa chỉ lấy và trả hàng."); } });
}
export function useShopShippingLocations(kind: "provinces" | "districts" | "wards", parentId?: string | number) {
  const url = `/api/v1/shipping/locations/${kind}`;
  const params = kind === "districts" ? { provinceId: parentId } : kind === "wards" ? { districtId: parentId } : undefined;
  return useQuery<ShippingLocation[]>({ queryKey: [url, params], queryFn: () => kind === "provinces" ? shippingControllerProvinces() : kind === "districts" ? shippingControllerDistricts({ provinceId: Number(parentId) }) : shippingControllerWards({ districtId: Number(parentId) }), enabled: kind === "provinces" || !!parentId, staleTime: 24 * 60 * 60_000 });
}
