import { z } from "zod";

/*
 * Form sản phẩm (Create/UpdateProductRequest). Giá là CHUỖI số nguyên VND
 * (backend nhận string), nhập ở form dạng số rồi đổi sang chuỗi khi gửi.
 * care/tags nhập mỗi dòng / phẩy một mục.
 */
const money = z
  .number({ message: "Nhập số tiền" })
  .int("Số nguyên VND")
  .min(0, "Không âm")
  .max(1_000_000_000, "Quá lớn");

export const productSchema = z
  .object({
    name: z.string().trim().min(2, "Tên 2–200 ký tự").max(200, "Tên 2–200 ký tự"),
    slug: z
      .string()
      .trim()
      .refine((v) => v === "" || /^[a-z0-9-]{2,200}$/.test(v), "Slug chỉ gồm a-z, 0-9 và dấu gạch ngang"),
    categoryId: z.string().min(1, "Chọn ngành hàng"),
    gender: z.enum(["nam", "nu", "unisex"], { message: "Chọn giới" }),
    basePrice: money,
    listPrice: z.union([money, z.nan()]).optional(),
    shortDescription: z.string().trim().max(500, "Tối đa 500 ký tự"),
    description: z.string().trim().max(10_000, "Tối đa 10.000 ký tự"),
    material: z.string().trim().max(200, "Tối đa 200 ký tự"),
    care: z.string().trim().max(1000),
    tags: z.string().trim().max(500),
    isNew: z.boolean(),
    isFeatured: z.boolean(),
  })
  .refine((v) => !v.listPrice || Number.isNaN(v.listPrice) || v.listPrice >= v.basePrice, {
    path: ["listPrice"],
    message: "Giá gốc phải ≥ giá bán",
  });

export type ProductInput = z.infer<typeof productSchema>;

/* Tách "a, b\nc" → ["a","b","c"] */
export function splitList(s: string): string[] {
  return s
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);
}
