import { z } from "zod";
import type { PromotionForm } from "@/lib/api/generated/model";
import { fromLocalInput } from "@/lib/format";

/*
 * Form mã giảm giá của gian hàng (CreatePromotionRequest / PromotionForm của
 * /shop/promotions). Giá trị: % (1–100) với percentage, VND (số nguyên > 0) với
 * fixed_amount, bỏ qua với free_shipping. Mã duy nhất toàn hệ thống (khách gõ mã
 * không kèm shop) — trùng thì backend trả PROMOTION_CODE_EXISTS, form gắn lỗi
 * vào ô "Mã". Thời gian nhập datetime-local rồi đổi sang ISO khi gửi.
 *
 * Các ô số TUỲ CHỌN (trần giảm, đơn tối thiểu, hạn mức) để trống = `undefined`
 * (xem `optionalNumber` ở form) nên khai `z.number().optional()` — thông báo lỗi
 * rõ ràng hơn so với z.union([z.number(), z.nan()]).
 */
export const shopPromotionSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{3,40}$/, "Mã 3–40 ký tự: chữ, số, gạch ngang (-) hoặc gạch dưới (_)"),
    name: z.string().trim().min(2, "Tên 2–200 ký tự").max(200, "Tên 2–200 ký tự"),
    description: z.string().trim().max(500, "Mô tả tối đa 500 ký tự"),
    type: z.enum(["percentage", "fixed_amount", "free_shipping"]),
    // Bắt buộc theo loại → kiểm ở superRefine; NaN = ô để trống.
    value: z.union([z.number(), z.nan()]),
    maxDiscount: z.number().int("Trần giảm là số nguyên (VND)").min(1, "Trần giảm phải lớn hơn 0").optional(),
    minOrderAmount: z.number().int("Đơn tối thiểu là số nguyên (VND)").min(0, "Đơn tối thiểu không được âm").optional(),
    usageLimit: z.number().int("Hạn mức là số nguyên").min(1, "Hạn mức tối thiểu 1 lượt").optional(),
    usageLimitPerUser: z.number().int("Hạn mức là số nguyên").min(1, "Hạn mức tối thiểu 1 lượt").optional(),
    appliesTo: z.enum(["all", "category", "product"]),
    /* slug ngành hàng (appliesTo=category) hoặc id sản phẩm (appliesTo=product). */
    targets: z.array(z.string()).max(100, "Tối đa 100 mục"),
    startsAt: z.string().min(1, "Chọn thời điểm bắt đầu"),
    endsAt: z.string().min(1, "Chọn thời điểm kết thúc"),
    isActive: z.boolean(),
    isPublic: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "percentage" && !(v.value >= 1 && v.value <= 100)) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Phần trăm giảm trong khoảng 1–100" });
    }
    if (v.type === "fixed_amount" && !(Number.isInteger(v.value) && v.value > 0)) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Số tiền giảm là số nguyên lớn hơn 0" });
    }
    if (v.appliesTo !== "all" && v.targets.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["targets"],
        message: v.appliesTo === "category" ? "Chọn ít nhất một ngành hàng" : "Chọn ít nhất một sản phẩm",
      });
    }
    if (v.startsAt && v.endsAt && new Date(v.endsAt) <= new Date(v.startsAt)) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Kết thúc phải sau thời điểm bắt đầu" });
    }
  });

export type ShopPromotionInput = z.infer<typeof shopPromotionSchema>;

/*
 * Input form → body gửi backend. Tiền gửi dạng chuỗi (backend `IsNumberString`);
 * ô trống gửi null để XOÁ giới hạn khi sửa. Không gửi `code` ở đây: tạo mới thêm
 * `code` ở nơi gọi, sửa thì mã bất biến (khách có thể đã lưu mã).
 */
export function buildShopPromotionBody(input: ShopPromotionInput): PromotionForm {
  return {
    name: input.name,
    description: input.description || null,
    type: input.type,
    value: input.type === "free_shipping" ? "0" : String(input.value),
    maxDiscount: input.type === "percentage" && input.maxDiscount !== undefined ? String(input.maxDiscount) : null,
    minOrderAmount: String(input.minOrderAmount ?? 0),
    usageLimit: input.usageLimit ?? null,
    usageLimitPerUser: input.usageLimitPerUser ?? null,
    appliesTo: input.appliesTo,
    targets: input.appliesTo === "all" ? [] : input.targets.map((ref) => ({ targetType: input.appliesTo as "category" | "product", targetRef: ref })),
    startsAt: fromLocalInput(input.startsAt),
    endsAt: fromLocalInput(input.endsAt),
    isActive: input.isActive,
    isPublic: input.isPublic,
  };
}
