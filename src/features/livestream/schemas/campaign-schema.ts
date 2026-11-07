import { z } from "zod";
export const campaignSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Mã cần ít nhất 3 ký tự.")
      .max(40, "Mã tối đa 40 ký tự.")
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "Mã chỉ gồm chữ, số, gạch ngang hoặc gạch dưới.",
      ),
    name: z
      .string()
      .trim()
      .min(3, "Tên ưu đãi cần ít nhất 3 ký tự.")
      .max(200, "Tên ưu đãi tối đa 200 ký tự."),
    type: z.enum(["percentage", "fixed_amount", "free_shipping"]),
    value: z
      .number({ error: "Nhập giá trị giảm hợp lệ." })
      .int("Giá trị giảm phải là số nguyên.")
      .min(0, "Giá trị không âm.")
      .max(100000000, "Giá trị vượt giới hạn."),
    minOrderAmount: z
      .string()
      .regex(
        /^\d{1,14}$/,
        "Giá trị tối thiểu là số VND nguyên, tối đa 14 chữ số.",
      ),
    maxDiscount: z
      .string()
      .regex(/^\d{0,14}$/, "Giảm tối đa là số VND nguyên, tối đa 14 chữ số."),
    claimLimit: z
      .number({ error: "Nhập giới hạn lượt nhận." })
      .int()
      .min(1, "Cần ít nhất 1 lượt nhận.")
      .max(10000, "Tối đa 10.000 lượt nhận."),
    usageLimit: z
      .number({ error: "Nhập giới hạn lượt dùng." })
      .int()
      .min(1, "Cần ít nhất 1 lượt dùng.")
      .max(10000, "Tối đa 10.000 lượt dùng."),
  })
  .refine((v) => v.type !== "percentage" || (v.value > 0 && v.value <= 100), {
    path: ["value"],
    message: "Phần trăm giảm phải lớn hơn 0 và không quá 100.",
  })
  .refine((v) => v.type !== "fixed_amount" || v.value > 0, {
    path: ["value"],
    message: "Số tiền giảm phải lớn hơn 0.",
  });
export type CampaignFormValues = z.infer<typeof campaignSchema>;
