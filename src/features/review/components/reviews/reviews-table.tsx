"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { EyeIcon, EyeOffIcon, Loader2Icon, MessageSquareReplyIcon, SparklesIcon, StarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/shared/data-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { InitialsAvatar } from "@/components/shared/initials-avatar";
import { NativeSelect } from "@/components/shared/native-select";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { isForbiddenError } from "@/lib/api-error";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { REVIEW_STATUS, statusMeta } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { useListState } from "@/hooks/use-list-state";
import { useAdminReviews, useModerateReview, useReplyReview } from "@/features/review/hooks/use-reviews";
import { useDraftReviewReply } from "@/features/review/hooks/use-review-ai";
import type { ReviewAdminResponse } from "@/features/review/types/review";

const TABS = [
  { key: "", label: "Tất cả" },
  { key: "approved", label: "Đang hiện" },
  { key: "hidden", label: "Đã ẩn" },
  { key: "pending", label: "Chờ duyệt" },
] as const;

const PAGE_SIZE = 12;
const LOAD_ERROR = "Không tải được đánh giá.";
const DEFAULTS = { status: "", rating: "" };

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex" aria-label={`${n} sao`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon key={i} className={cn("size-3.5", i < n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
      ))}
    </span>
  );
}

/*
 * Đánh giá của khách: lọc trạng thái / số sao, tìm nội dung. Hành động: ẩn /
 * hiện (kèm ghi chú kiểm duyệt) và trả lời thay cửa hàng (có nút AI soạn nháp).
 */
export function ReviewsTable() {
  const { filters, setFilter, search, setSearch, keyword, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const moderate = useModerateReview();
  const [moderating, setModerating] = useState<ReviewAdminResponse | null>(null);
  const [replying, setReplying] = useState<ReviewAdminResponse | null>(null);

  const { data, isLoading, isError, error } = useAdminReviews({
    keyword,
    status: filters.status,
    rating: filters.rating ? Number(filters.rating) : undefined,
    page,
    size: PAGE_SIZE,
  });

  const columns: ColumnDef<ReviewAdminResponse>[] = useMemo(
    () => [
      {
        id: "review",
        header: "Đánh giá",
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex max-w-xl items-start gap-3">
              <InitialsAvatar name={r.author} src={r.avatarUrl ?? undefined} className="size-8" />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{r.author}</span>
                  <Stars n={r.rating} />
                  <span className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</span>
                </p>
                <p className="text-sm">{r.content}</p>
                {r.media.length ? (
                  <div className="mt-1 flex gap-1">
                    {r.media.slice(0, 4).map((m, i) => (
                      <a key={i} href={m.url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh động */}
                        <img src={m.url} alt="" className="size-10 rounded object-cover" />
                      </a>
                    ))}
                  </div>
                ) : null}
                {r.reply ? (
                  <p className="mt-1.5 rounded-md bg-muted px-2 py-1 text-xs">
                    <b>{r.reply.staffName}:</b> {r.reply.content}
                  </p>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        id: "product",
        header: "Sản phẩm",
        cell: ({ row }) => (
          <div className="leading-tight">
            <Link href={`${ROUTES.product.products}/${row.original.productId}`} className="text-sm font-medium hover:underline">
              {row.original.productName}
            </Link>
            <p className="text-xs text-muted-foreground">
              {row.original.variantLabel ?? ""}
              {row.original.orderCode ? ` · ${row.original.orderCode}` : ""}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const m = statusMeta(REVIEW_STATUS, row.original.status);
          return (
            <div className="leading-tight">
              <StatusBadge tone={m.tone}>{m.label}</StatusBadge>
              {row.original.moderationNote ? <p className="pt-1 text-xs text-muted-foreground">{row.original.moderationNote}</p> : null}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex justify-end gap-1">
              <PermissionGate permission={PERMISSIONS.reviewReply}>
                <Button variant="outline" size="sm" className="h-8" onClick={() => setReplying(r)}>
                  <MessageSquareReplyIcon className="size-3.5" />
                  {r.reply ? "Sửa trả lời" : "Trả lời"}
                </Button>
              </PermissionGate>
              <PermissionGate permission={PERMISSIONS.reviewModerate}>
                {r.status === "approved" ? (
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => setModerating(r)}>
                    <EyeOffIcon className="size-3.5" />
                    Ẩn
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => moderate.mutate({ id: r.id, body: { status: "approved" } })}>
                    <EyeIcon className="size-3.5" />
                    Hiện
                  </Button>
                )}
              </PermissionGate>
            </div>
          );
        },
      },
    ],
    [moderate],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <FilterTabs tabs={TABS} value={filters.status} onChange={(v) => setFilter("status", v)} />
        <NativeSelect aria-label="Số sao" className="w-32" value={filters.rating} onChange={(e) => setFilter("rating", e.target.value)}>
          <option value="">Mọi số sao</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={String(n)}>
              {n} sao
            </option>
          ))}
        </NativeSelect>
      </div>
      {isError ? <ApiErrorState error={error} fallback={LOAD_ERROR} compact /> : null}
      <DataTable
        columns={columns}
        data={data?.content ?? []}
        loading={isLoading}
        searchPlaceholder="Tìm nội dung đánh giá…"
        searchValue={search}
        onSearchChange={setSearch}
        serverPagination={{
          pageIndex,
          pageSize: PAGE_SIZE,
          pageCount: data?.totalPages || 1,
          total: data?.totalElements ?? 0,
          onPageChange: setPageIndex,
        }}
      />
      <HideReviewDialog review={moderating} onClose={() => setModerating(null)} />
      <ReplyReviewDialog review={replying} onClose={() => setReplying(null)} />
    </div>
  );
}

function HideReviewDialog({ review, onClose }: { review: ReviewAdminResponse | null; onClose: () => void }) {
  return (
    <Dialog open={!!review} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        {review ? <HideReviewBody key={review.id} review={review} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function HideReviewBody({ review, onClose }: { review: ReviewAdminResponse; onClose: () => void }) {
  const moderate = useModerateReview();
  const [note, setNote] = useState("");
  return (
    <>
      <DialogHeader>
        <DialogTitle>Ẩn đánh giá?</DialogTitle>
        <DialogDescription>Đánh giá không hiện trên web; điểm trung bình được tính lại.</DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="mod-note">Ghi chú kiểm duyệt (tuỳ chọn)</FieldLabel>
          <Input id="mod-note" placeholder="Spam / ngôn từ không phù hợp…" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button
          variant="destructive"
          disabled={moderate.isPending}
          onClick={() => moderate.mutate({ id: review.id, body: { status: "hidden", note: note || undefined } }, { onSuccess: onClose })}
        >
          {moderate.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Ẩn
        </Button>
      </DialogFooter>
    </>
  );
}

function ReplyReviewDialog({ review, onClose }: { review: ReviewAdminResponse | null; onClose: () => void }) {
  return (
    <Dialog open={!!review} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {review ? <ReplyReviewBody key={review.id} review={review} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ReplyReviewBody({ review, onClose }: { review: ReviewAdminResponse; onClose: () => void }) {
  const reply = useReplyReview();
  const draft = useDraftReviewReply();
  const [content, setContent] = useState(review.reply?.content ?? "");
  return (
    <>
      <DialogHeader>
        <DialogTitle>Trả lời thay cửa hàng</DialogTitle>
        <DialogDescription>
          {review.author} · <Stars n={review.rating} /> · {review.productName}
        </DialogDescription>
      </DialogHeader>
      <p className="rounded-md bg-muted px-3 py-2 text-sm">{review.content}</p>
      <FieldGroup>
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="reply-content">Nội dung trả lời</FieldLabel>
            <PermissionGate permission={PERMISSIONS.aiCopyCreate}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-primary"
                disabled={draft.isPending}
                onClick={() =>
                  draft.mutate(
                    { rating: review.rating, content: review.content, productName: review.productName },
                    { onSuccess: (r) => setContent(r.text) },
                  )
                }
              >
                {draft.isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : <SparklesIcon className="size-3.5" />}
                AI soạn nháp
              </Button>
            </PermissionGate>
          </div>
          <Textarea id="reply-content" rows={5} value={content} onChange={(e) => setContent(e.target.value)} maxLength={1000} />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button disabled={reply.isPending || content.trim().length < 2} onClick={() => reply.mutate({ id: review.id, content: content.trim() }, { onSuccess: onClose })}>
          {reply.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Gửi trả lời
        </Button>
      </DialogFooter>
    </>
  );
}
