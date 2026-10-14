"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, MessageSquareReplyIcon, ThumbsUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { isForbiddenError } from "@/lib/api-error";
import { PERMISSIONS } from "@/lib/constants";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { ShopReviewResponse } from "@/lib/api/generated/model";
import { useShopReviews } from "@/features/review/hooks/use-shop-reviews";
import { ReviewStars } from "@/features/review/components/common/review-stars";
import { VendorReplyDialog } from "@/features/review/components/vendor/vendor-reply-dialog";

const PAGE_SIZE = 10;
const LOAD_ERROR = "Không tải được đánh giá.";
const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL || "";

function ProductLink({ review }: { review: ShopReviewResponse }) {
  // Chỉ có link khi cấu hình URL web bán hàng (cùng quy ước với "Xem trên web" ở chi tiết sản phẩm).
  return STOREFRONT_URL ? (
    <a href={`${STOREFRONT_URL}/product/${review.productSlug}`} target="_blank" rel="noreferrer" className="font-medium hover:underline">
      {review.productName}
    </a>
  ) : (
    <span className="font-medium">{review.productName}</span>
  );
}

function ReviewCard({ review, onReply }: { review: ShopReviewResponse; onReply: (r: ShopReviewResponse) => void }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <ReviewStars rating={review.rating} />
          <span className="font-medium">{review.authorDisplay}</span>
          <span className="text-xs text-muted-foreground">{formatDateTime(review.createdAt)}</span>
        </div>
        {/* Chỉ là nhãn: backend không có tham số lọc "đã/chưa trả lời", lọc trong một trang sẽ sai tổng số. */}
        <StatusBadge tone={review.reply ? "success" : "warning"}>{review.reply ? "Đã trả lời" : "Chưa trả lời"}</StatusBadge>
      </div>

      <p className="text-sm">
        <ProductLink review={review} />
        {review.variantLabel ? <span className="text-muted-foreground"> · {review.variantLabel}</span> : null}
      </p>

      <p className="text-sm whitespace-pre-wrap">{review.content}</p>

      {review.images.length ? (
        <div className="flex flex-wrap gap-1.5">
          {review.images.map((url, i) => (
            <a key={`${url}-${i}`} href={url} target="_blank" rel="noreferrer" aria-label={`Xem ảnh đánh giá ${i + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- ảnh động */}
              <img src={url} alt="" className="size-16 rounded-md border object-cover" />
            </a>
          ))}
        </div>
      ) : null}

      {review.reply ? (
        <div className="rounded-lg bg-muted px-3 py-2 text-sm">
          <p className="text-xs text-muted-foreground">Phản hồi của shop · {formatDateTime(review.reply.createdAt)}</p>
          <p className="mt-0.5 whitespace-pre-wrap">{review.reply.content}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <ThumbsUpIcon className="size-3.5" />
          {formatNumber(review.helpfulCount)} lượt hữu ích
        </span>
        <PermissionGate permission={PERMISSIONS.shopReviewReply}>
          <Button variant="outline" size="sm" className="h-8" onClick={() => onReply(review)}>
            <MessageSquareReplyIcon className="size-3.5" />
            {review.reply ? "Sửa phản hồi" : "Trả lời"}
          </Button>
        </PermissionGate>
      </div>
    </article>
  );
}

function ReviewCardsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border p-4">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-4 w-56 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/*
 * Đánh giá của sản phẩm thuộc shop (GET /shop/reviews): chỉ đánh giá ĐÃ DUYỆT, phân
 * trang server. Chưa có endpoint thống kê điểm trung bình / phân bố sao cho vendor
 * nên màn không tự tính trên một trang — chỉ hiện tổng số đánh giá do server đếm.
 */
export function VendorReviewsList() {
  const [pageIndex, setPageIndex] = useState(0);
  const [replying, setReplying] = useState<ShopReviewResponse | null>(null);
  const { data, isLoading, isError, error } = useShopReviews({ page: pageIndex + 1, size: PAGE_SIZE });

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  const rows = data?.content ?? [];
  const pageCount = data?.totalPages || 1;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {data ? <b className="text-foreground">{formatNumber(data.totalElements)}</b> : "…"} đánh giá đã duyệt · đánh giá bị sàn ẩn hoặc đang chờ duyệt không hiện ở đây.
      </p>

      {isError ? <ApiErrorState error={error} fallback={LOAD_ERROR} compact /> : null}

      {isLoading ? (
        <ReviewCardsSkeleton />
      ) : rows.length ? (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <ReviewCard key={r.id} review={r} onReply={setReplying} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">Chưa có đánh giá nào cho sản phẩm của shop.</p>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Trang {pageIndex + 1} / {pageCount}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8" aria-label="Trang trước" disabled={pageIndex <= 0} onClick={() => setPageIndex(pageIndex - 1)}>
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button variant="outline" size="icon" className="size-8" aria-label="Trang sau" disabled={pageIndex >= pageCount - 1} onClick={() => setPageIndex(pageIndex + 1)}>
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>

      <VendorReplyDialog review={replying} onClose={() => setReplying(null)} />
    </div>
  );
}
