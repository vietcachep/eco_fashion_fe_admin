import { z } from "zod";
export const sessionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Tên phiên cần ít nhất 3 ký tự.")
    .max(120, "Tên phiên tối đa 120 ký tự."),
  description: z.string().trim().max(2000, "Mô tả tối đa 2.000 ký tự."),
  coverUrl: z.string(),
  scheduledAt: z.string(),
});
export type SessionFormValues = z.infer<typeof sessionSchema>;
