import { z } from "zod";

function isHttpsUrl(v: string): boolean {
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
}

/*
 * Chuyển trạng thái đơn của vendor. Trạng thái đích do dialog biết (không phải
 * ô nhập) nên schema chỉ giữ hai ô tuỳ chọn. Link theo dõi hiện cho khách bấm
 * vào → backend chỉ nhận https (chặn javascript:, data:, http thường).
 */
export const shopStatusSchema = z.object({
  trackingUrl: z
    .string()
    .trim()
    .max(500, "Tối đa 500 ký tự")
    .refine((v) => v === "" || isHttpsUrl(v), "Link theo dõi phải bắt đầu bằng https://"),
  note: z.string().trim().max(500, "Tối đa 500 ký tự"),
});
export type ShopStatusInput = z.infer<typeof shopStatusSchema>;

/* Backend ShopCancelOrderRequest: @Length(5, 255). */
export const shopCancelOrderSchema = z.object({
  reason: z.string().trim().min(5, "Nhập lý do huỷ (tối thiểu 5 ký tự)").max(255, "Tối đa 255 ký tự"),
});
export type ShopCancelOrderInput = z.infer<typeof shopCancelOrderSchema>;
