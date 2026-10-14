"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ShopReviewResponse } from "@/lib/api/generated/model";
import { shopReviewControllerReply, useShopReviewControllerList } from "@/lib/api/generated/shops/shops";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";

/*
 * Đánh giá cho CỔNG VENDOR (/shop/reviews). Backend chỉ trả đánh giá ĐÃ DUYỆT của
 * sản phẩm thuộc shop mình và KHÔNG có tham số lọc (không `status`, không "đã/chưa
 * trả lời") — nên hook chỉ nhận page/size. Khách được che tên (`authorDisplay`).
 * Ẩn / hiện / kiểm duyệt là việc của nhân viên sàn, vendor không có ở đây.
 */
const PATH = "/api/v1/shop/reviews";

export function useShopReviews(params: { page: number; size: number }) {
  return useShopReviewControllerList(params, {
    query: {
      select: (r) => asPage<ShopReviewResponse>(r),
      placeholderData: keepPreviousData,
      staleTime: 30_000,
    },
  });
}

/*
 * Trả lời / sửa trả lời (một đánh giá một phản hồi, gọi lại = ghi đè) — cùng một
 * endpoint POST. KHÔNG toast lỗi: dialog hiện lỗi ngay trong khung đang mở
 * (vd REVIEW_NOT_FOUND khi sàn vừa ẩn đánh giá đó).
 */
export function useReplyShopReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => shopReviewControllerReply(id, { content }),
    onSuccess: () => {
      invalidateByPath(qc, PATH);
      toast.success("Đã gửi phản hồi.");
    },
  });
}
