import { z } from "zod";
import { ADMIN_CANCEL_REASON_CODES, IN_TRANSIT_CANCEL_MIN_REASON } from "@/features/order/types/order";

/*
 * Huỷ đơn thay khách (backend AdminCancelOrderRequest: `reason` @Length(3, 255) + `reasonCode` dispute | fraud | other). Đơn ĐANG GIAO
 * hoặc ĐANG ĐÓNG GÓI huỷ khi tranh chấp phải có lý do rõ (≥ 10 ký tự, backend 400 nếu ngắn hơn) nên schema là hàm theo ngữ cảnh —
 * dialog biết đơn đang ở trạng thái nào.
 */
export function buildCancelOrderSchema(strict: boolean) {
  const min = strict ? IN_TRANSIT_CANCEL_MIN_REASON : 3;
  return z.object({
    reasonCode: z.enum(ADMIN_CANCEL_REASON_CODES),
    reason: z
      .string()
      .trim()
      .min(min, strict ? `Đơn đang đóng gói / đang giao cần lý do rõ ràng (tối thiểu ${min} ký tự)` : "Nhập lý do huỷ")
      .max(255, "Tối đa 255 ký tự"),
  });
}
export type CancelOrderInput = z.infer<ReturnType<typeof buildCancelOrderSchema>>;
