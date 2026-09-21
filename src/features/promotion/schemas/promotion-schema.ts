import { z } from "zod";

/*
 * Form mã khuyến mãi (CreatePromotionRequest / PromotionForm). Giá trị: % (1–100)
 * với percentage, VND với fixed_amount, bỏ qua với free_shipping. Tiền nhập số
 * rồi gửi chuỗi. Thời gian nhập datetime-local → ISO.
 */
export const promotionSchema = z
  .object({
    code: z.string().trim().regex(/^[A-Za-z0-9_-]{3,40}$/, "Mã 3–40 ký tự chữ/số/_/-"),
    name: z.string().trim().min(2, "Tên 2–200 ký tự").max(200),
    description: z.string().trim().max(500),
    type: z.enum(["percentage", "fixed_amount", "free_shipping"]),
    value: z.union([z.number().min(0), z.nan()]),
    maxDiscount: z.union([z.number().int().min(0), z.nan()]).optional(),
    minOrderAmount: z.union([z.number().int().min(0), z.nan()]).optional(),
    usageLimit: z.union([z.number().int().min(1), z.nan()]).optional(),
    usageLimitPerUser: z.union([z.number().int().min(1), z.nan()]).optional(),
    appliesTo: z.enum(["all", "category", "product"]),
    targets: z.string().trim(),
    startsAt: z.string().min(1, "Chọn thời điểm bắt đầu"),
    endsAt: z.string().min(1, "Chọn thời điểm kết thúc"),
    isActive: z.boolean(),
    isPublic: z.boolean(),
  })
  .refine((v) => v.type === "free_shipping" || (!Number.isNaN(v.value) && v.value > 0), {
    path: ["value"],
    message: "Nhập mức giảm",
  })
  .refine((v) => v.type !== "percentage" || Number.isNaN(v.value) || v.value <= 100, {
    path: ["value"],
    message: "Tối đa 100%",
  })
  .refine((v) => v.appliesTo === "all" || v.targets.length > 0, {
    path: ["targets"],
    message: "Nhập slug ngành hàng / id sản phẩm áp dụng (mỗi dòng một mục)",
  })
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
    path: ["endsAt"],
    message: "Kết thúc phải sau bắt đầu",
  });

export type PromotionInput = z.infer<typeof promotionSchema>;
