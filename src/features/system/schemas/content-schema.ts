import { z } from "zod";

export const faqSchema = z.object({
  question: z.string().trim().min(5, "Câu hỏi 5–300 ký tự").max(300),
  answer: z.string().trim().min(5, "Câu trả lời 5–3000 ký tự").max(3000),
  groupCode: z.string().trim().max(40),
  sortOrder: z.number().int().min(0),
  isActive: z.boolean(),
});
export type FaqInput = z.infer<typeof faqSchema>;

export const pageSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]{2,60}$/, "Slug 2–60 ký tự a-z, 0-9, gạch ngang"),
  title: z.string().trim().min(2, "Tiêu đề 2–200 ký tự").max(200),
  content: z.string().trim().min(1, "Nhập nội dung").max(50_000),
  isActive: z.boolean(),
});
export type PageInput = z.infer<typeof pageSchema>;

export const broadcastSchema = z.object({
  title: z.string().trim().min(2, "Tiêu đề 2–200 ký tự").max(200),
  content: z.string().trim().max(1000),
  link: z.string().trim().max(500),
});
export type BroadcastInput = z.infer<typeof broadcastSchema>;
