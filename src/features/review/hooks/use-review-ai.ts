"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminAiControllerCopy } from "@/lib/api/generated/admin-ai/admin-ai";
import { apiErrorMessage } from "@/lib/api-error";

/*
 * AI soạn nháp trả lời đánh giá (POST /admin/ai/copy kind=review_reply, quyền
 * ai.copy.create). Nhân viên sửa rồi gửi — AI không tự đăng gì.
 */
export function useDraftReviewReply() {
  return useMutation({
    mutationFn: async (input: { rating: number; content: string; productName: string }) =>
      (await adminAiControllerCopy({
        kind: "review_reply",
        context: `Sản phẩm: ${input.productName}\nĐánh giá ${input.rating}/5 sao: ${input.content}`,
        tone: "thân thiện, lịch sự",
      })) as unknown as { text: string; source: string },
    onError: (e) => toast.error(apiErrorMessage(e, "AI không soạn được nháp.")),
  });
}
