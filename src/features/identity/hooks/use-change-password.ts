"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { changePassword } from "@/features/identity/api/auth-api";
import { useAuthStore } from "@/stores/auth-store";
import { ROUTES } from "@/lib/constants";
import type { ChangePasswordInput } from "@/features/identity/schemas/change-password-schema";

/*
 * Đổi mật khẩu của chính mình. Backend THU HỒI MỌI PHIÊN (kể cả phiên này)
 * sau khi đổi → client xoá token và đưa về /login để đăng nhập lại.
 */
export function useChangePassword() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: ChangePasswordInput) => changePassword(input),
    onSuccess: () => {
      toast.success("Đã đổi mật khẩu, vui lòng đăng nhập lại.");
      useAuthStore.getState().clear();
      queryClient.clear();
      router.replace(ROUTES.login);
    },
    onError: (error) => toast.error(error.message),
  });
}
