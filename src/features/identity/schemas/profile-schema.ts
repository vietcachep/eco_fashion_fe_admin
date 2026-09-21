import { z } from "zod";
import { PHONE_VN } from "./password-rule";

/* Hồ sơ của tôi: chỉ họ tên + SĐT sửa được (email là định danh, không đổi). */
export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Họ tên 2–120 ký tự").max(120, "Họ tên 2–120 ký tự"),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || PHONE_VN.test(v), "Số điện thoại Việt Nam không hợp lệ"),
});

export type ProfileInput = z.infer<typeof profileSchema>;
