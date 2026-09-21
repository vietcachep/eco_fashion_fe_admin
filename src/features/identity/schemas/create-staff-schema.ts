import { z } from "zod";
import { passwordField, PHONE_VN } from "./password-rule";

const STAFF_ROLE_CODES = ["admin", "manager", "sales", "warehouse", "accountant", "marketing"] as const;

/* Tạo tài khoản nhân viên (backend CreateStaffRequest). */
export const createStaffSchema = z.object({
  email: z.string().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
  fullName: z.string().trim().min(2, "Họ tên 2–120 ký tự").max(120, "Họ tên 2–120 ký tự"),
  roleCode: z.enum(STAFF_ROLE_CODES, { message: "Chọn vai trò" }),
  password: passwordField,
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || PHONE_VN.test(v), "Số điện thoại Việt Nam không hợp lệ"),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

/* Sửa hồ sơ nhân viên bởi admin (UpdateUserByAdminRequest). */
export const updateUserSchema = z.object({
  fullName: z.string().trim().min(2, "Họ tên 2–120 ký tự").max(120, "Họ tên 2–120 ký tự"),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || PHONE_VN.test(v), "Số điện thoại Việt Nam không hợp lệ"),
  roleCode: z.enum(STAFF_ROLE_CODES, { message: "Chọn vai trò" }),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/* Admin đặt lại mật khẩu cho nhân viên. */
export const adminResetPasswordSchema = z
  .object({
    newPassword: passwordField,
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu nhập lại không khớp",
  });

export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;
