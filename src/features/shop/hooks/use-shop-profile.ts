"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { shopControllerUpdateMe, useShopControllerMe } from "@/lib/api/generated/shops/shops";
import type { UpdateShopProfileRequest } from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";

/*
 * Hồ sơ gian hàng của CHÍNH MÌNH (vendor, quyền shop.profile.*) — GET/PATCH /shop/me. `shopId` do server suy từ
 * JWT/ShopMember, FE không bao giờ gửi. Hồ sơ này cũng gồm tài khoản ngân hàng nhận đối soát (bankCode/…Masked).
 */
const ME_PATH = "/api/v1/shop/me";
// Phiên vendor (/shop/session) và hồ sơ /auth/me (header hiện tên shop) mang bản sao tên gian hàng → làm mới cùng lúc.
const RELATED = ["/api/v1/shop/session", "/api/v1/auth/me"];

export function useMyShop() {
  return useShopControllerMe({ query: { staleTime: 60_000 } });
}

/* `successMessage` để cùng một mutation phục vụ cả form hồ sơ lẫn form tài khoản ngân hàng (cùng endpoint PATCH). */
export function useUpdateMyShop(successMessage = "Đã lưu hồ sơ gian hàng.") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateShopProfileRequest) => shopControllerUpdateMe(body),
    onSuccess: () => {
      invalidateByPath(qc, ME_PATH, ...RELATED);
      toast.success(successMessage);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Lưu thất bại.")),
  });
}
