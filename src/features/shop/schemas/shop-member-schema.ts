import { z } from "zod";

/* Mật khẩu: 8–64 ký tự, có chữ và số — cùng luật với backend (identity PASSWORD_RULE), backend vẫn là nơi quyết định. */
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;

/* Form thêm nhân viên vào gian hàng của mình (POST /shop/members) — chủ shop TẠO TÀI KHOẢN cho nhân viên, không mời/không chờ chấp nhận. */
export const shopMemberAddSchema = z.object({
  fullName: z.string().trim().min(2, "Họ tên tối thiểu 2 ký tự").max(120, "Họ tên tối đa 120 ký tự"),
  email: z.string().trim().email("Email không hợp lệ"),
  password: z.string().regex(PASSWORD_RULE, "Mật khẩu 8–64 ký tự, gồm cả chữ và số"),
  roleCode: z.enum(["shop_owner", "shop_staff"]),
});

export type ShopMemberAddInput = z.infer<typeof shopMemberAddSchema>;

/* Form đổi vai một thành viên (PATCH /shop/members/:id). */
export const shopMemberRoleSchema = z.object({
  roleCode: z.enum(["shop_owner", "shop_staff"]),
});

export type ShopMemberRoleInput = z.infer<typeof shopMemberRoleSchema>;
