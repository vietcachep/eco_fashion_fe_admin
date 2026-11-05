import { z } from "zod";
import { formatVnd } from "@/lib/format";

/*
 * Form đổi trả (PLAN-0022). Ràng buộc chép từ backend `order/return/request/return.requests.ts`; backend vẫn kiểm lại,
 * schema chỉ để báo lỗi sớm đúng ô. Minh chứng KHÔNG nằm trong schema: ảnh tải lên từng tệp (POST /uploads/media) nên
 * dialog giữ danh sách URL trong state, tối đa RETURN_EVIDENCE_MAX.
 */
export const RETURN_EVIDENCE_MAX = 8;

/* Giống PHONE_VN của backend (0xxxxxxxxx hoặc +84xxxxxxxxx). */
const PHONE_VN = /^(0|\+84)(\d{9,10})$/;

const NUMBER_REQUIRED = "Nhập số tiền hoàn";

/*
 * Shop DUYỆT. Số tiền hoàn chỉ được GIẢM so với số hệ thống tính sẵn (`calculated`); giảm thì bắt buộc lý do.
 * Yêu cầu cần trả hàng (`requireReturn`) phải có địa chỉ nhận hàng trả — form luôn gửi lại địa chỉ (điền sẵn từ
 * `suggestedReturnAddress`) để backend không phải đoán; yêu cầu "chưa nhận hàng" duyệt là hoàn tiền ngay nên không có địa chỉ.
 */
export function buildApproveReturnSchema({ calculated, requireReturn }: { calculated: number; requireReturn: boolean }) {
  return z
    .object({
      refundAmount: z
        .number({ message: NUMBER_REQUIRED })
        .int("Số tiền phải là số nguyên VND")
        .min(0, "Không âm")
        .max(calculated, `Chỉ được giảm, tối đa ${formatVnd(calculated)}`),
      adjustReason: z.string().trim().max(500, "Tối đa 500 ký tự"),
      returnName: z.string().trim(),
      returnPhone: z.string().trim(),
      returnAddress: z.string().trim(),
    })
    .superRefine((v, ctx) => {
      if (v.refundAmount < calculated && v.adjustReason.length < 5) {
        ctx.addIssue({ code: "custom", path: ["adjustReason"], message: "Giảm số tiền hoàn thì phải nêu lý do (tối thiểu 5 ký tự)" });
      }
      if (!requireReturn) return;
      if (v.returnName.length < 2 || v.returnName.length > 120) {
        ctx.addIssue({ code: "custom", path: ["returnName"], message: "Tên người nhận hàng trả 2–120 ký tự" });
      }
      if (!PHONE_VN.test(v.returnPhone)) {
        ctx.addIssue({ code: "custom", path: ["returnPhone"], message: "Số điện thoại Việt Nam không hợp lệ" });
      }
      if (v.returnAddress.length < 5 || v.returnAddress.length > 300) {
        ctx.addIssue({ code: "custom", path: ["returnAddress"], message: "Địa chỉ nhận hàng trả 5–300 ký tự" });
      }
    });
}
export type ApproveReturnInput = z.infer<ReturnType<typeof buildApproveReturnSchema>>;

/* Shop TỪ CHỐI: lý do 10–500 ký tự (khách đọc được, và là căn cứ khi khách khiếu nại lên sàn). */
export const rejectReturnSchema = z.object({
  reason: z.string().trim().min(10, "Nêu lý do từ chối (tối thiểu 10 ký tự)").max(500, "Tối đa 500 ký tự"),
});
export type RejectReturnInput = z.infer<typeof rejectReturnSchema>;

/* Shop xác nhận ĐÃ NHẬN hàng: "không khớp" chuyển sàn phân xử nên bắt buộc ghi chú ≥ 10 ký tự. */
export const receiveReturnSchema = z
  .object({
    condition: z.enum(["ok", "not_matching"]),
    note: z.string().trim().max(500, "Tối đa 500 ký tự"),
  })
  .superRefine((v, ctx) => {
    if (v.condition === "not_matching" && v.note.length < 10) {
      ctx.addIssue({ code: "custom", path: ["note"], message: "Hàng không khớp: mô tả rõ điểm khác biệt (tối thiểu 10 ký tự)" });
    }
  });
export type ReceiveReturnInput = z.infer<typeof receiveReturnSchema>;

/*
 * SÀN phân xử (chỉ yêu cầu `escalated`). Ghi chú 5–500 ký tự BẮT BUỘC (khách + shop đều đọc). Số tiền hoàn chỉ có nghĩa khi hoàn tiền;
 * trần "tổng đơn − đã hoàn ở yêu cầu khác" response không mang theo nên để backend kiểm (ORDER_RETURN_REFUND_TOO_HIGH).
 */
export const resolveReturnSchema = z
  .object({
    decision: z.enum(["refund", "reject"]),
    note: z.string().trim().min(5, "Ghi chú phân xử bắt buộc (tối thiểu 5 ký tự)").max(500, "Tối đa 500 ký tự"),
    refundAmount: z.number({ message: NUMBER_REQUIRED }).int("Số tiền phải là số nguyên VND").min(0, "Không âm").optional(),
  })
  .superRefine((v, ctx) => {
    if (v.decision === "refund" && (v.refundAmount === undefined || v.refundAmount <= 0)) {
      ctx.addIssue({ code: "custom", path: ["refundAmount"], message: "Nhập số tiền hoàn lớn hơn 0" });
    }
  });
export type ResolveReturnInput = z.infer<typeof resolveReturnSchema>;
