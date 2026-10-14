import { z } from "zod";

/*
 * Form xin nộp thêm quỹ COD (POST /shop/wallet/deposit-requests). Giới hạn khớp backend CreateDepositRequestDto:
 * số nguyên VND, tối thiểu 10.000đ, trần 1 tỷ (chặn nhập nhầm); ghi chú ≤ 500. Ảnh chứng từ đi đường upload
 * (chọn file → POST /uploads/media → gửi `proofUrl`) nên không nằm trong schema.
 */
export const shopDepositSchema = z.object({
  amount: z
    .number({ message: "Nhập số tiền" })
    .int("Số tiền phải là số nguyên")
    .min(10_000, "Số tiền nộp tối thiểu 10.000đ")
    .max(1_000_000_000, "Tối đa 1.000.000.000đ"),
  note: z.string().trim().max(500, "Ghi chú tối đa 500 ký tự"),
});

export type ShopDepositInput = z.infer<typeof shopDepositSchema>;
