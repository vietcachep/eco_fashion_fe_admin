import { z } from "zod";

/* Banner (BannerFormRequest). Ảnh xử lý ngoài Zod (File). */
export const bannerSchema = z
  .object({
    title: z.string().trim().min(2, "Tiêu đề 2–200 ký tự").max(200),
    subtitle: z.string().trim().max(300, "Tối đa 300 ký tự"),
    linkUrl: z.string().trim().max(500, "Tối đa 500 ký tự"),
    position: z.enum(["hero", "promo"]),
    sortOrder: z.number().int().min(0),
    isActive: z.boolean(),
    startsAt: z.string(),
    endsAt: z.string(),
  })
  .refine((v) => !v.startsAt || !v.endsAt || new Date(v.endsAt) > new Date(v.startsAt), {
    path: ["endsAt"],
    message: "Kết thúc phải sau bắt đầu",
  });

export type BannerInput = z.infer<typeof bannerSchema>;
