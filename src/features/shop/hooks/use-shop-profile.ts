"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { shopControllerUpdateMe, useShopControllerMe } from "@/lib/api/generated/shops/shops";
import type { ShopResponse, UpdateShopProfileRequest } from "@/lib/api/generated/model";
import { apiErrorCode, apiErrorDetail, apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";

/*
 * Hồ sơ gian hàng của CHÍNH MÌNH (vendor, quyền shop.profile.*) — GET/PATCH /shop/me. `shopId` do server suy từ
 * JWT/ShopMember, FE không bao giờ gửi. Hồ sơ này cũng gồm tài khoản ngân hàng nhận đối soát (bankCode/…Masked),
 * trạng thái xác minh (`bankStatus`) và số giờ giữ chi trả sau khi đổi TK (`bankChangeHoldHours`, đọc từ backend — không ghi cứng).
 */
const ME_PATH = "/api/v1/shop/me";
// Phiên vendor (/shop/session) và hồ sơ /auth/me (header hiện tên shop) mang bản sao tên gian hàng → làm mới cùng lúc.
const RELATED = ["/api/v1/shop/session", "/api/v1/auth/me"];

export function useMyShop() {
  return useShopControllerMe({ query: { staleTime: 60_000 } });
}

/*
 * Mật khẩu sai khi đổi TK ngân hàng, mà tài khoản đang đăng nhập có liên kết Google (mật khẩu ngẫu nhiên, không ai biết):
 * backend giữ mã 400 `SHOP_BANK_PASSWORD_INVALID` nhưng kèm `details.googleLinked = "true"` — UI phải hướng dẫn đặt mật khẩu
 * qua "Quên mật khẩu" thay vì để người dùng thử lại vô vọng.
 */
export function isGoogleLinkedBankPasswordError(e: unknown): boolean {
  return apiErrorCode(e) === "SHOP_BANK_PASSWORD_INVALID" && apiErrorDetail(e, "googleLinked") === "true";
}

/*
 * `successMessage` để cùng một mutation phục vụ cả form hồ sơ lẫn form tài khoản ngân hàng (cùng endpoint PATCH); dạng hàm nhận
 * hồ sơ mới trả về để câu thông báo dùng được `bankStatus` / `bankChangeHoldHours` thật của backend.
 * Lỗi "tài khoản Google" KHÔNG toast: form ngân hàng hiện khung hướng dẫn cố định thay cho toast thoáng qua.
 */
export function useUpdateMyShop(successMessage: string | ((shop: ShopResponse) => string) = "Đã lưu hồ sơ gian hàng.") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateShopProfileRequest) => shopControllerUpdateMe(body),
    onSuccess: (shop) => {
      invalidateByPath(qc, ME_PATH, ...RELATED);
      toast.success(typeof successMessage === "function" ? successMessage(shop) : successMessage);
    },
    onError: (e) => {
      if (isGoogleLinkedBankPasswordError(e)) return;
      toast.error(apiErrorMessage(e, "Lưu thất bại."));
    },
  });
}
