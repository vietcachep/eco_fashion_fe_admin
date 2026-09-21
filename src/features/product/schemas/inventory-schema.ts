import { z } from "zod";

/* Phiếu nhập kho (CreateReceiptRequest) — dòng: biến thể, số lượng, đơn giá vốn. */
export const receiptItemSchema = z.object({
  variantId: z.string().min(1, "Chọn biến thể"),
  label: z.string(),
  quantity: z.number({ message: "Nhập số lượng" }).int().min(1, "≥ 1").max(100_000, "≤ 100.000"),
  unitCost: z.number({ message: "Nhập giá vốn" }).int().min(0, "Không âm"),
});

export const receiptSchema = z.object({
  supplierName: z.string().trim().max(200),
  note: z.string().trim().max(500),
  items: z.array(receiptItemSchema).min(1, "Phiếu cần ít nhất 1 dòng"),
});

export type ReceiptInput = z.infer<typeof receiptSchema>;
export type ReceiptItemInputForm = z.infer<typeof receiptItemSchema>;

/* Điều chỉnh tồn (AdjustStockRequest): delta âm/dương + lý do bắt buộc. */
export const adjustStockSchema = z.object({
  delta: z
    .number({ message: "Nhập số lượng" })
    .int()
    .refine((v) => v !== 0, "Số lượng khác 0 (âm = trừ, dương = cộng)"),
  reason: z.string().trim().min(3, "Nhập lý do (kiểm kê, hỏng, mất…)").max(300),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
