import { z } from "zod";

/* Giá trị thuộc tính (SaveAttributeValueRequest); hex chỉ dùng cho bộ màu. */
export const attributeValueSchema = z.object({
  code: z.string().trim().regex(/^[a-z0-9-]{1,40}$/, "Mã chỉ gồm a-z, 0-9, gạch ngang"),
  name: z.string().trim().min(1, "Nhập tên").max(80, "Tối đa 80 ký tự"),
  hex: z
    .string()
    .trim()
    .refine((v) => v === "" || /^#[0-9a-fA-F]{6}$/.test(v), "Mã màu dạng #RRGGBB"),
  groupCode: z.string().trim().max(40),
  sortOrder: z.number().int().min(0).max(9999),
  isActive: z.boolean(),
});

export type AttributeValueInput = z.infer<typeof attributeValueSchema>;
