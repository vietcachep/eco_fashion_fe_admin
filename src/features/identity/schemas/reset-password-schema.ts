import { z } from "zod";
import { passwordField } from "./password-rule";

/* Đặt lại bằng OTP 6 số gửi qua email (backend ResetPasswordRequest). */
export const resetPasswordSchema = z
  .object({
    email: z.string().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
    otp: z.string().regex(/^\d{6}$/, "Mã xác nhận gồm 6 chữ số"),
    newPassword: passwordField,
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu mới"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu nhập lại không khớp",
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
