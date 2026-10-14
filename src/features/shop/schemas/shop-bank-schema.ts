import { z } from "zod";

/*
 * Form tài khoản ngân hàng nhận tiền đối soát (PATCH /shop/me — bankCode / bankAccountNumber / bankAccountName).
 * Luôn gửi ĐỦ cả ba: lần đầu backend bắt buộc đủ ba, và khi đổi số TK / BIN phải gửi lại tên chủ TK.
 * Số tài khoản backend chỉ trả bản che nên không điền sẵn được — người dùng nhập lại số (cũng là bước xác nhận).
 */
export const shopBankSchema = z.object({
  bankCode: z.string().regex(/^\d{6}$/, "Chọn ngân hàng"),
  bankAccountNumber: z.string().trim().regex(/^\d{6,20}$/, "Số tài khoản gồm 6–20 chữ số"),
  bankAccountName: z
    .string()
    .trim()
    .min(2, "Nhập tên chủ tài khoản")
    .max(120, "Tối đa 120 ký tự")
    .regex(/^[A-Z ]+$/, "Tên chủ tài khoản IN HOA, không dấu (ví dụ NGUYEN VAN A)"),
});

export type ShopBankInput = z.infer<typeof shopBankSchema>;

/* Bỏ dấu tiếng Việt + IN HOA + gộp khoảng trắng — để gõ "Nguyễn Văn A" ra "NGUYEN VAN A" đúng tên in trên thẻ/sao kê. */
export function normalizeBankAccountName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toUpperCase()
    .replace(/\s+/g, " ");
}
