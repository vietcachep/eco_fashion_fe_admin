"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2Icon, RefreshCwIcon, SparklesIcon, StarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/shared/data-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { isForbiddenError } from "@/lib/api-error";
import { ROUTES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { MODERATION_LABEL, REVIEW_STATUS, statusMeta } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { useModerateNow, useModerationFlags, useSummarizeReviews } from "@/features/ai/hooks/use-ai-admin";
import type { ModerationFlagResponse } from "@/features/ai/types/ai";

const TABS = [
  { key: "", label: "Cần xem (≠ ok)" },
  { key: "spam", label: "Spam" },
  { key: "toxic", label: "Độc hại" },
  { key: "off_topic", label: "Lạc đề" },
  { key: "ok", label: "Bình thường" },
] as const;

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được nhãn kiểm duyệt.";

/*
 * Nhãn AI đề xuất cho đánh giá (spam / độc hại / lạc đề + điểm tin cậy).
 * AI chỉ ĐỀ XUẤT — quyết ẩn/hiện ở màn Đánh giá. Có nút chạy lại AI cho một
 * đánh giá và ô tạo lại tóm tắt đánh giá theo sản phẩm.
 */
export function ModerationScreen() {
  const [label, setLabel] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const { data, isLoading, isError, error } = useModerationFlags({ label, page: pageIndex + 1, size: PAGE_SIZE });
  const moderateNow = useModerateNow();
  const summarize = useSummarizeReviews();
  const [productId, setProductId] = useState("");

  const columns: ColumnDef<ModerationFlagResponse>[] = useMemo(
    () => [
      {
        id: "review",
        header: "Đánh giá",
        cell: ({ row }) => {
          const r = row.original.review;
          return r ? (
            <div className="max-w-md leading-tight">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon key={i} className={cn("size-3", i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                ))}
                <Link href={`${ROUTES.product.products}/${r.productId}`} className="ml-1 hover:underline">
                  sản phẩm
                </Link>
              </p>
              <p className="text-sm">{r.content}</p>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Đánh giá đã xoá</span>
          );
        },
      },
      {
        accessorKey: "label",
        header: "Nhãn AI",
        cell: ({ row }) => {
          const m = statusMeta(MODERATION_LABEL, row.original.label);
          return (
            <div className="leading-tight">
              <StatusBadge tone={m.tone}>
                {m.label} · {Math.round(row.original.score * 100)}%
              </StatusBadge>
              {row.original.reason ? <p className="pt-0.5 text-xs text-muted-foreground">{row.original.reason}</p> : null}
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Trạng thái đánh giá",
        cell: ({ row }) => {
          const m = statusMeta(REVIEW_STATUS, row.original.review?.status);
          return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
        },
      },
      { accessorKey: "createdAt", header: "Chấm lúc", cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.createdAt)} · {row.original.model}</span> },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" className="h-8" disabled={moderateNow.isPending} onClick={() => moderateNow.mutate(row.original.reviewId)}>
              <RefreshCwIcon className="size-3.5" />
              Chấm lại
            </Button>
            <Button variant="outline" size="sm" nativeButton={false} className="h-8" render={<Link href={`${ROUTES.review.reviews}?q=${encodeURIComponent(row.original.review?.content.slice(0, 30) ?? "")}`} />}>
              Xử lý
            </Button>
          </div>
        ),
      },
    ],
    [moderateNow],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <FilterTabs
        tabs={TABS}
        value={label}
        onChange={(v) => {
          setLabel(v);
          setPageIndex(0);
        }}
      />
      {isError ? <ApiErrorState error={error} fallback={LOAD_ERROR} compact /> : null}
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        serverPagination={{ pageIndex, pageSize: PAGE_SIZE, pageCount, total: data?.total ?? 0, onPageChange: setPageIndex }}
      />

      <Card className="border-dashed py-0">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <SparklesIcon className="size-4 text-primary" />
          <div className="text-sm">
            <p className="font-medium">Tạo lại tóm tắt đánh giá cho một sản phẩm</p>
            <p className="text-xs text-muted-foreground">Dán ID sản phẩm (lấy từ URL chi tiết sản phẩm).</p>
          </div>
          <Input className="w-80 font-mono text-xs" placeholder="uuid sản phẩm" value={productId} onChange={(e) => setProductId(e.target.value.trim())} />
          <Button variant="outline" disabled={!productId || summarize.isPending} onClick={() => summarize.mutate(productId)}>
            {summarize.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Tóm tắt
          </Button>
          {summarize.data ? (
            <p className="w-full text-sm">
              <b>Tóm tắt:</b> {summarize.data.summary}
              {summarize.data.pros.length ? <span className="block text-xs text-emerald-700">+ {summarize.data.pros.join(" · ")}</span> : null}
              {summarize.data.cons.length ? <span className="block text-xs text-red-700">− {summarize.data.cons.join(" · ")}</span> : null}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
