import { z } from "zod";

/*
 * Đánh dấu kỳ đã chi (MarkPaidRequest): mã chứng từ bắt buộc ≤ 120, ghi chú ≤ 255.
 * `confirmGatewayNotExecuted` (PLAN-0040 6.2): kỳ đang processing/unknown BẮT BUỘC tick "đã tra bảng điều khiển PayOS: lệnh KHÔNG được
 * thực hiện" — chống chi trùng. Kỳ failed/pending không cần; lúc đó ô không hiện nên giá trị luôn false.
 */
const base = z.object({
  providerRef: z.string().trim().min(1, "Nhập mã giao dịch / chứng từ").max(120, "Tối đa 120 ký tự"),
  note: z.string().trim().max(255, "Tối đa 255 ký tự"),
  confirmGatewayNotExecuted: z.boolean(),
});

export const payoutMarkPaidSchema = (requireGatewayConfirm: boolean) =>
  base.refine((v) => !requireGatewayConfirm || v.confirmGatewayNotExecuted, {
    path: ["confirmGatewayNotExecuted"],
    message: "Tick xác nhận đã tra bảng điều khiển PayOS rồi mới đánh dấu tay",
  });

export type PayoutMarkPaidInput = z.infer<typeof base>;
