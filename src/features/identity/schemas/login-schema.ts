import { z } from "zod";

/*
 * Schema form đăng nhập — nguồn sự thật duy nhất của validation
 * (docs/03_API_STATE_RULES.md). Backend nhận `email` (không phải username).
 */
export const loginSchema = z.object({
  email: z.string().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export type LoginInput = z.infer<typeof loginSchema>;
