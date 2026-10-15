import { z } from "zod";

/*
 * Một ô lý do / ghi chú dùng cho nhiều thao tác phía sàn. Mỗi thao tác chỉ khác
 * nhau ở độ dài tối thiểu → quy tắc khai theo từng API bên dưới, khớp validator
 * của backend (class-validator) để lỗi báo ngay tại form thay vì sau khi gọi API.
 */
export interface ReasonRule {
  min: number;
  max: number;
  /** Câu báo khi thiếu/ngắn hơn `min`. */
  requiredMessage: string;
}

export const reasonSchema = (rule: ReasonRule) =>
  z.object({
    text: z.string().trim().min(rule.min, rule.requiredMessage).max(rule.max, `Tối đa ${rule.max} ký tự`),
  });

export type ReasonInput = z.infer<ReturnType<typeof reasonSchema>>;

/* Khoá / từ chối gian hàng — SuspendShopRequest / RejectShopRequest: 3–500 ký tự. */
export const SHOP_REASON_RULE: ReasonRule = { min: 3, max: 500, requiredMessage: "Nhập lý do (tối thiểu 3 ký tự)" };

