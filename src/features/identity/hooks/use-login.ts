"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AuthError,
  getCurrentUser,
  login,
  NOT_STAFF_CODE,
} from "@/features/identity/api/auth-api";
import { CURRENT_USER_QUERY_KEY } from "@/features/identity/hooks/use-current-user";
import { useAuthStore } from "@/stores/auth-store";
import type { LoginInput } from "@/features/identity/schemas/login-schema";

/*
 * Mutation đăng nhập. Đăng nhập → lưu cặp token vào store (AT trong RAM, RT
 * persist) → làm ấm cache hồ sơ (/auth/me) để app shell có tên + vai + quyền
 * ngay khi render. Component gọi useLogin() rồi điều hướng khi thành công;
 * không bao giờ đụng token.
 *
 * Mutation trả về mã quyền hiệu lực để component điều hướng tới màn đầu tiên
 * người đó có quyền (lib/constants firstAllowedRoute).
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const pair = await login(input);
      useAuthStore.getState().setTokens(pair.accessToken, pair.refreshToken);
      // Trả mã quyền để form chọn màn đầu tiên người này được vào; /me lỗi tạm
      // thời thì vẫn đăng nhập được (về dashboard, shell sẽ refetch).
      try {
        const me = await queryClient.fetchQuery({ queryKey: CURRENT_USER_QUERY_KEY, queryFn: getCurrentUser });
        return me.permissionCodes ?? [];
      } catch {
        return [];
      }
    },
    onError: (error) => {
      // Khách vào nhầm khu quản trị là cảnh báo (vàng), không phải lỗi hệ thống.
      if (error instanceof AuthError && error.code === NOT_STAFF_CODE) {
        toast.warning(error.message);
      } else {
        toast.error(error.message);
      }
    },
  });
}
