import { z } from "zod";

/*
 * Thuộc tính động (CreateDynamicAttributeRequest). `inputType` CHỈ select | text | number — màu không
 * phải kiểu riêng mà là thuộc tính `select` có giá trị mang mã hex (backend @IsIn(DYNAMIC_INPUT_TYPES)).
 * Mã: backend chỉ kiểm độ dài 2–60 và duy nhất; FE siết thêm chữ thường/số/gạch dưới để mã ổn định
 * làm định danh (seed hiện có đều dạng này: color2, size_attr, screen_size…).
 */
export const dynamicAttributeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Mã 2–60 ký tự")
    .max(60, "Mã 2–60 ký tự")
    .regex(/^[a-z0-9_]+$/, "Mã chỉ gồm chữ thường a-z, số 0-9 và gạch dưới (_)"),
  name: z.string().trim().min(2, "Tên 2–100 ký tự").max(100, "Tên 2–100 ký tự"),
  inputType: z.enum(["select", "text", "number"], { message: "Chọn kiểu nhập" }),
});

export type DynamicAttributeInput = z.infer<typeof dynamicAttributeSchema>;

/*
 * Giá trị của thuộc tính `select` (Create/UpdateDynamicAttributeValueRequest). `hex` để trống = không
 * gắn màu; backend lưu vào `extra.hex`. Giá trị duy nhất trong một thuộc tính (409 CATALOG_VALUE_EXISTS).
 */
export const dynamicAttributeValueSchema = z.object({
  value: z.string().trim().min(1, "Nhập giá trị").max(100, "Tối đa 100 ký tự"),
  hex: z
    .string()
    .trim()
    .refine((v) => v === "" || /^#[0-9a-fA-F]{6}$/.test(v), "Mã màu dạng #RRGGBB"),
  sortOrder: z.number({ message: "Nhập số nguyên ≥ 0" }).int("Nhập số nguyên ≥ 0").min(0, "Nhập số nguyên ≥ 0").max(9999, "Tối đa 9999"),
});

export type DynamicAttributeValueInput = z.infer<typeof dynamicAttributeValueSchema>;
