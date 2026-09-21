"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminReviewControllerModerate,
  adminReviewControllerReply,
  useAdminReviewControllerList,
} from "@/lib/api/generated/admin-reviews/admin-reviews";
import type { ModerateRequest } from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";
import type { ReviewAdminResponse } from "@/features/review/types/review";

/* Đánh giá đã mua: kiểm duyệt (hiện / ẩn kèm ghi chú), trả lời thay cửa hàng. */
const PATH = "/api/v1/admin/reviews";

export function useAdminReviews(params: { keyword?: string; status?: string; rating?: number; page: number; size: number }) {
  return useAdminReviewControllerList(
    {
      q: params.keyword || undefined,
      status: (params.status || undefined) as never,
      rating: params.rating,
      page: params.page,
      size: params.size,
    },
    {
      query: {
        select: (r) => asPage<ReviewAdminResponse>(r),
        placeholderData: keepPreviousData,
        staleTime: 15_000,
      },
    },
  );
}

export function useModerateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ModerateRequest }) => adminReviewControllerModerate(id, body),
    onSuccess: (_r, v) => {
      invalidateByPath(qc, PATH, "/api/v1/admin/products", "/api/v1/admin/ai/moderation-flags");
      toast.success(v.body.status === "approved" ? "Đánh giá đã hiển thị." : "Đã ẩn đánh giá.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Kiểm duyệt thất bại.")),
  });
}

export function useReplyReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => adminReviewControllerReply(id, { content }),
    onSuccess: () => {
      invalidateByPath(qc, PATH);
      toast.success("Đã gửi trả lời.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Gửi trả lời thất bại.")),
  });
}
