"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { logout } from "@/features/identity/api/auth-api";
import { useAuthStore } from "@/stores/auth-store";
import { ROUTES } from "@/lib/constants";

/*
 * Mutation đăng xuất. Nhờ backend thu hồi refresh token + blacklist access
 * token, rồi LUÔN xoá state cục bộ và đưa về /login. Dọn dẹp chạy trong
 * onSettled (thành công lẫn thất bại) nên lỗi mạng không bao giờ để người dùng
 * kẹt "đang đăng nhập" ở client:
 * - auth-store.clear() bỏ token trong RAM + localStorage.
 * - queryClient.clear() xoá TOÀN BỘ cache server (hồ sơ /me, danh sách…) để
 *   người đăng nhập sau không thấy dữ liệu người trước.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      useAuthStore.getState().clear();
      queryClient.clear();
      router.replace(ROUTES.login);
    },
  });
}
