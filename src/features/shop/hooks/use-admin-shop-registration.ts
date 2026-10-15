"use client";

import { useAdminShopRegistrationControllerGet } from "@/lib/api/generated/admin-shop-registrations/admin-shop-registrations";
import type { ShopRegistrationDetailResponse } from "@/lib/api/generated/model";

/*
 * Hồ sơ đăng ký của một gian hàng (sàn xem, quyền supplier.shop.read) — thông tin người bán khai khi tự đăng ký (PLAN-0019).
 * Backend trả `data = null` cho shop KHÔNG do người bán tự đăng ký (seed / sàn tạo); Swagger khai kiểu không-null nên ép kiểu
 * ĐÚNG MỘT CHỖ này để màn hình chỉ phải xử lý `null`.
 */
export function useAdminShopRegistration(shopId: string) {
  return useAdminShopRegistrationControllerGet(shopId, {
    query: {
      enabled: !!shopId,
      staleTime: 30_000,
      select: (r) => (r ?? null) as ShopRegistrationDetailResponse | null,
    },
  });
}
