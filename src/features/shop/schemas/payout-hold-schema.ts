import type { ReasonRule } from "@/features/shop/schemas/reason-schema";

/*
 * Lý do giữ tay tiền chi trả — CreatePayoutHoldRequest.reason: 5–255 ký tự. Dùng chung `ReasonDialog` (RHF + Zod) nên chỉ khai quy tắc
 * ở đây, khớp validator backend để lỗi báo ngay tại form.
 */
export const PAYOUT_HOLD_REASON_RULE: ReasonRule = { min: 5, max: 255, requiredMessage: "Nhập lý do giữ (5–255 ký tự)" };
