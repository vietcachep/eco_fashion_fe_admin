import { z } from "zod";

/*
 * Mẫu thuộc tính của ngành `dynamic` (SetCategoryAttributeTemplateRequest — replace-all).
 * Luật khớp backend `category-attribute.service.ts setTemplate`: kiểm trước ở FE để người dùng thấy
 * lý do ngay, backend vẫn là nơi chặn thật (lỗi 4xx của nó được hiện nguyên văn khi lưu).
 */
export const MAX_VARIANT_AXIS = 2;
export const MAX_TEMPLATE_ATTRIBUTES = 50;

const rowSchema = z.object({
  attributeId: z.string().min(1),
  required: z.boolean(),
  isVariantAxis: z.boolean(),
  /* Ba trường dưới CHỈ để hiển thị + kiểm "trục phải là select" ở FE — KHÔNG gửi lên backend. */
  inputType: z.enum(["select", "text", "number"]),
  name: z.string(),
  code: z.string(),
  valueCount: z.number(),
});

export const categoryTemplateSchema = z
  .object({
    /* Thứ tự phần tử trong mảng = sortOrder gửi lên. */
    rows: z.array(rowSchema).max(MAX_TEMPLATE_ATTRIBUTES, `Tối đa ${MAX_TEMPLATE_ATTRIBUTES} thuộc tính cho một ngành`),
  })
  .superRefine(({ rows }, ctx) => {
    const axes = rows.filter((r) => r.isVariantAxis);
    if (axes.length > MAX_VARIANT_AXIS) {
      ctx.addIssue({ code: "custom", path: ["rows"], message: `Tối đa ${MAX_VARIANT_AXIS} thuộc tính làm trục biến thể cho một ngành hàng.` });
    }
    // Có thuộc tính mà không có trục nào → sản phẩm không tạo được biến thể (backend 400 CATALOG_VARIANT_AXIS_REQUIRED).
    if (rows.length > 0 && axes.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["rows"],
        message: "Cần chọn ít nhất 1 thuộc tính làm trục biến thể (vd Màu sắc, Dung lượng) — nếu không sản phẩm không tạo được biến thể nào.",
      });
    }
    for (const r of axes) {
      if (r.inputType !== "select") {
        ctx.addIssue({
          code: "custom",
          path: ["rows"],
          message: `"${r.name}" là thuộc tính nhập tay nên không làm trục biến thể được — trục phải là kiểu Lựa chọn.`,
        });
      }
    }
  });

export type CategoryTemplateInput = z.infer<typeof categoryTemplateSchema>;
export type CategoryTemplateRow = CategoryTemplateInput["rows"][number];
