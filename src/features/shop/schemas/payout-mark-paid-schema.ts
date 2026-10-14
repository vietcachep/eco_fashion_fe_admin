import { z } from "zod";

/* Đánh dấu kỳ đã chi (MarkPaidRequest): mã chứng từ bắt buộc ≤ 120, ghi chú ≤ 255. */
export const payoutMarkPaidSchema = z.object({
  providerRef: z.string().trim().min(1, "Nhập mã giao dịch / chứng từ").max(120, "Tối đa 120 ký tự"),
  note: z.string().trim().max(255, "Tối đa 255 ký tự"),
});

export type PayoutMarkPaidInput = z.infer<typeof payoutMarkPaidSchema>;
