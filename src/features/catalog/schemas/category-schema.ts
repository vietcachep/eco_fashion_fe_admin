import { z } from "zod";

/* Ngành hàng (Create/UpdateCategoryRequest). slug trống = backend tự sinh từ tên. */
export const categorySchema = z.object({
  name: z.string().trim().min(2, "Tên 2–120 ký tự").max(120, "Tên 2–120 ký tự"),
  slug: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[a-z0-9-]{2,120}$/.test(v), "Slug chỉ gồm a-z, 0-9 và dấu gạch ngang"),
  description: z.string().trim().max(1000, "Tối đa 1000 ký tự"),
  parentId: z.string(),
  sortOrder: z.number().int().min(0).max(9999),
  isActive: z.boolean(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
