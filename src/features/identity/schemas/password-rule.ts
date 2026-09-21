import { z } from "zod";

/*
 * Luật mật khẩu KHỚP backend (auth.requests.ts PASSWORD_RULE): 8–64 ký tự, có
 * cả chữ và số. Dùng chung cho đổi/đặt lại/tạo nhân viên để không lệch server.
 */
export const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;
export const PASSWORD_MSG = "Mật khẩu 8–64 ký tự, gồm cả chữ và số";

export const passwordField = z.string().regex(PASSWORD_RULE, PASSWORD_MSG);

/* SĐT Việt Nam như backend PHONE_VN. */
export const PHONE_VN = /^(0|\+84)(\d{9,10})$/;
export const phoneField = z
  .string()
  .regex(PHONE_VN, "Số điện thoại Việt Nam không hợp lệ");
