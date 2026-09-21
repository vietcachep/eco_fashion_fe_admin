import { z } from "zod";

/* Bộ sưu tập (Create/UpdateCollectionRequest): tên + bộ lọc ngành/giới/tag. */
export const collectionSchema = z.object({
  name: z.string().trim().min(2, "Tên 2–120 ký tự").max(120, "Tên 2–120 ký tự"),
  slug: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[a-z0-9-]{2,120}$/.test(v), "Slug chỉ gồm a-z, 0-9 và dấu gạch ngang"),
  tagline: z.string().trim().max(200, "Tối đa 200 ký tự"),
  queryCategorySlug: z.string(),
  queryGender: z.enum(["", "nam", "nu", "unisex"]),
  queryTag: z.string().trim().max(60),
  sortOrder: z.number().int().min(0).max(9999),
  isActive: z.boolean(),
});

export type CollectionInput = z.infer<typeof collectionSchema>;
