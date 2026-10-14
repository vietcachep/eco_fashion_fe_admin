import { z } from "zod";

/*
 * Phản hồi của gian hàng dưới đánh giá (ShopReviewReplyRequest): 1–1000 ký tự và
 * không toàn khoảng trắng — `.trim()` rồi `min(1)` bắt đúng luật `@Matches(/\S/)` của
 * backend. Phản hồi hiển thị công khai dưới tên gian hàng.
 */
export const shopReviewReplySchema = z.object({
  content: z.string().trim().min(1, "Nhập nội dung phản hồi").max(1000, "Tối đa 1000 ký tự"),
});

export type ShopReviewReplyInput = z.infer<typeof shopReviewReplySchema>;
