import { z } from "zod";

export const updateStatusSchema = z.object({
  status: z.enum(["confirmed", "packing", "shipping", "delivered", "completed"]),
  trackingUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https?:\/\//.test(v), "Link theo dõi phải bắt đầu bằng http(s)://"),
  note: z.string().trim().max(500, "Tối đa 500 ký tự"),
});
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(3, "Nhập lý do huỷ").max(300, "Tối đa 300 ký tự"),
});
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

export const processReturnSchema = z
  .object({
    decision: z.enum(["approved", "rejected"]),
    rejectReason: z.string().trim().max(300),
    refundAmount: z.union([z.number().int().min(0), z.nan()]).optional(),
  })
  .refine((v) => v.decision !== "rejected" || v.rejectReason.length >= 3, {
    path: ["rejectReason"],
    message: "Nhập lý do từ chối",
  });
export type ProcessReturnInput = z.infer<typeof processReturnSchema>;
