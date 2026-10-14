import { z } from "zod";

/*
 * Form hồ sơ gian hàng của chính mình (PATCH /shop/me): chỉ tên + mô tả. Logo/banner đi đường upload ảnh
 * (chọn file → POST /uploads/media → gửi URL), nên không phải trường text của form.
 * Giới hạn khớp backend UpdateShopProfileRequest: tên 2–200, mô tả ≤ 2000.
 */
export const shopProfileSchema = z.object({
  name: z.string().trim().min(2, "Tên 2–200 ký tự").max(200, "Tên 2–200 ký tự"),
  description: z.string().trim().max(2000, "Mô tả tối đa 2000 ký tự"),
});

export type ShopProfileInput = z.infer<typeof shopProfileSchema>;
