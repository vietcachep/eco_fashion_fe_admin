"use client";

import { useAdminShopControllerList } from "@/lib/api/generated/admin-shops/admin-shops";
import { PERMISSIONS } from "@/lib/constants";
import { usePermission } from "@/hooks/use-permission";
import { asPage } from "@/types/common";

/*
 * Tên gian hàng theo id cho cột "Phạm vi" ở màn mã khuyến mãi của sàn: backend
 * trả `shopId` nhưng `shopName` luôn null ở API quản trị. Tra từ danh sách shop
 * (/admin/shops, cần quyền `supplier.shop.read`) — nhân viên thiếu quyền đó thì
 * KHÔNG gọi (tránh 403 vô ích) và badge tự rơi về nhãn "Gian hàng …xxxx".
 * Chỉ lấy trang đầu 100 shop: đủ cho sàn hiện tại, shop ngoài trang giữ nhãn rút gọn.
 */
export function usePromotionShopNames() {
  const canReadShops = usePermission(PERMISSIONS.supplierShopRead);
  return useAdminShopControllerList(
    { page: 1, size: 100 },
    {
      query: {
        enabled: canReadShops,
        staleTime: 5 * 60_000,
        select: (r) => new Map(asPage<{ id: string; name: string }>(r).content.map((s) => [s.id, s.name] as const)),
      },
    },
  );
}
