import { z } from "zod";

/*
 * Giới hạn của backend (eco_backend product/inventory/request/inventory.requests.ts +
 * service/inventory.service.ts) — chặn sớm ở form để người dùng thấy lỗi tại chỗ thay vì
 * đợi 400/409 từ server. Backend vẫn là nơi enforce thật.
 */
export const INVENTORY_LIMITS = {
  /** Số lượng mỗi dòng phiếu nhập / mỗi lần điều chỉnh. */
  maxQuantity: 100_000,
  /** Số dòng tối đa trong một phiếu. */
  maxLines: 500,
  /** unitCost chỉ chữ số, 1–12 ký tự (VND nguyên, không âm). */
  maxUnitCost: 999_999_999_999,
  /** Tồn kho tối đa của một biến thể (PRODUCT_STOCK_LIMIT_EXCEEDED). */
  maxStock: 1_000_000_000,
  /** Tổng giá trị phiếu tối đa (PRODUCT_RECEIPT_TOTAL_TOO_LARGE) — numeric(14,0) của DB. */
  maxReceiptTotal: 99_999_999_999_999,
  reasonMin: 3,
  reasonMax: 255,
} as const;

/* Phiếu nhập kho (CreateReceiptRequest) — dòng: biến thể, số lượng, đơn giá vốn. */
const receiptItemSchema = z.object({
  variantId: z.string().min(1, "Chọn biến thể"),
  label: z.string(),
  quantity: z
    .number({ message: "Nhập số lượng" })
    .int("Phải là số nguyên")
    .min(1, "≥ 1")
    .max(INVENTORY_LIMITS.maxQuantity, "≤ 100.000"),
  unitCost: z
    .number({ message: "Nhập giá vốn" })
    .int("Phải là số nguyên đồng")
    .min(0, "Không âm")
    .max(INVENTORY_LIMITS.maxUnitCost, "Tối đa 12 chữ số"),
});

export const receiptSchema = z
  .object({
    supplierName: z.string().trim().max(200, "Tối đa 200 ký tự"),
    note: z.string().trim().max(500, "Tối đa 500 ký tự"),
    items: z
      .array(receiptItemSchema)
      .min(1, "Phiếu cần ít nhất 1 dòng")
      .max(INVENTORY_LIMITS.maxLines, "Tối đa 500 dòng mỗi phiếu — tách thành nhiều phiếu"),
  })
  .refine(
    (v) => {
      const total = receiptTotal(v.items);
      return !Number.isFinite(total) || total <= INVENTORY_LIMITS.maxReceiptTotal;
    },
    { message: "Tổng giá trị phiếu vượt 99.999.999.999.999 ₫ — tách thành nhiều phiếu", path: ["items"] },
  );

export type ReceiptInput = z.infer<typeof receiptSchema>;

/* Tổng vốn của phiếu = Σ số lượng × giá vốn (dòng chưa nhập số hợp lệ tính 0). */
export function receiptTotal(items: ReadonlyArray<{ quantity: number; unitCost: number }>): number {
  return items.reduce(
    (s, i) => s + (Number.isFinite(i.quantity) ? i.quantity : 0) * (Number.isFinite(i.unitCost) ? i.unitCost : 0),
    0,
  );
}

/* Điều chỉnh tồn (AdjustStockRequest): delta âm/dương, nguyên, khác 0, |delta| ≤ 100.000 + lý do 3–255 ký tự. */
export const adjustStockSchema = z.object({
  delta: z
    .number({ message: "Nhập số lượng" })
    .int("Phải là số nguyên")
    .min(-INVENTORY_LIMITS.maxQuantity, "Tối đa ±100.000 mỗi lần")
    .max(INVENTORY_LIMITS.maxQuantity, "Tối đa ±100.000 mỗi lần")
    .refine((v) => v !== 0, "Số lượng khác 0 (âm = trừ, dương = cộng)"),
  reason: z
    .string()
    .trim()
    .min(INVENTORY_LIMITS.reasonMin, "Nhập lý do (kiểm kê, hỏng, mất…) — ít nhất 3 ký tự")
    .max(INVENTORY_LIMITS.reasonMax, "Tối đa 255 ký tự"),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
