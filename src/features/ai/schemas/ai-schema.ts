import { z } from "zod";

/* Tài liệu kho tri thức (SaveDocumentRequest). */
export const documentSchema = z.object({
  title: z.string().trim().min(3, "Tiêu đề 3–200 ký tự").max(200),
  kind: z.enum(["policy", "faq", "guide", "product"]),
  content: z.string().trim().min(10, "Nội dung ít nhất 10 ký tự").max(20_000, "Tối đa 20.000 ký tự"),
  isActive: z.boolean(),
});
export type DocumentInput = z.infer<typeof documentSchema>;

/* Công cụ soạn nội dung (CopyRequest). */
export const copySchema = z.object({
  kind: z.enum(["product_description", "review_reply", "promotion_copy"]),
  context: z.string().trim().min(5, "Nhập ngữ cảnh ít nhất 5 ký tự").max(3000),
  tone: z.string().trim().max(80),
});
export type CopyInput = z.infer<typeof copySchema>;

/* Gợi ý phân loại (ClassifyRequest). */
export const classifySchema = z.object({
  name: z.string().trim().min(2, "Nhập tên sản phẩm").max(200),
  description: z.string().trim().max(2000),
  material: z.string().trim().max(200),
});
export type ClassifyInput = z.infer<typeof classifySchema>;
