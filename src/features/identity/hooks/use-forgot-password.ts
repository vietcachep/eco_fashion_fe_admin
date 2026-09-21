"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { forgotPassword, resetPassword } from "@/features/identity/api/auth-api";
import type { ForgotPasswordInput } from "@/features/identity/schemas/forgot-password-schema";
import type { ResetPasswordInput } from "@/features/identity/schemas/reset-password-schema";

/* Gửi OTP đặt lại mật khẩu qua email (backend luôn 200, không lộ email). */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) => forgotPassword(input),
    onError: (error) => toast.error(error.message),
  });
}

/* Đặt lại mật khẩu bằng OTP 6 số. */
export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => resetPassword(input),
    onError: (error) => toast.error(error.message),
  });
}
