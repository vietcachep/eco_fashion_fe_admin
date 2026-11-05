"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { BellRingIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { DataTable } from "@/components/shared/data-table";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import type { ShopReturnRequestResponse } from "@/lib/api/generated/model";
import { isForbiddenError } from "@/lib/api-error";
import { ROUTES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { RETURN_ESCALATE_SOURCE_SHORT, RETURN_REASON_LABEL } from "@/lib/labels";
import { useListState } from "@/hooks/use-list-state";
import { ReturnDeadline } from "@/features/order/components/returns-common/return-deadline";
import { useNow } from "@/features/order/hooks/use-now";
import { useShopReturns } from "@/features/order/hooks/use-shop-returns";
import { returnItemSummary, returnStatusMeta, SHOP_RETURN_TABS, shopNeedsAction } from "@/features/order/types/return";

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được danh sách đổi trả.";
const DEFAULTS = { status: "" };

const detailHref = (id: string) => `${ROUTES.vendor.returns}/${id}`;

/* Trạng thái + (khi đã chuyển sàn) lý do chuyển — shop thấy ngay mình có cần giải trình không. */
function StatusCell({ request: r }: { request: ShopReturnRequestResponse }) {
  const m = returnStatusMeta(r);
  return (
    <div className="flex flex-col items-start gap-1">
      <StatusBadge tone={m.tone}>{m.label}</StatusBadge>
      {r.status === "escalated" && r.escalateSource ? (
        <span className="text-xs text-muted-foreground">{RETURN_ESCALATE_SOURCE_SHORT[r.escalateSource] ?? r.escalateSource}</span>
      ) : null}
    </div>
  );
}

function ActionChip({ request }: { request: ShopReturnRequestResponse }) {
  if (!shopNeedsAction(request)) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      <BellRingIcon className="size-3" />
      Cần xử lý
    </span>
  );
}

/* Thẻ cho màn hẹp (< md): cả thẻ là link tới chi tiết. */
function ReturnCard({ request: r, now }: { request: ShopReturnRequestResponse; now: number }) {
  return (
    <Link href={detailHref(r.id)} className="flex flex-col gap-2.5 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/50">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-sm font-semibold">{r.orderCode}</span>
        <StatusCell request={r} />
      </div>
      <p className="line-clamp-2 text-sm leading-snug">{returnItemSummary(r)}</p>
      <p className="text-xs text-muted-foreground">{RETURN_REASON_LABEL[r.reasonCode] ?? r.reasonCode}</p>
      <div className="flex items-end justify-between gap-2 text-sm">
        <div className="min-w-0">
          <p className="font-semibold">{r.codReversed ? "Đảo ghi thu COD" : r.refundAmount.display}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <ReturnDeadline deadlineAt={r.deadlineAt} deadlineKind={r.deadlineKind} now={now} compact />
          <ActionChip request={r} />
        </div>
      </div>
    </Link>
  );
}

function ReturnCardsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2.5 rounded-xl border p-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full rounded" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/*
 * Danh sách yêu cầu đổi trả của gian hàng (cổng shop). Tab theo trạng thái; cột "Hạn" đếm ngược `deadlineAt` do backend tính
 * (đỏ khi còn < 12 giờ — quá hạn hệ thống tự chuyển sàn phân xử). Bảng ở ≥ md, thẻ ở màn hẹp. Backend không trả tên khách ở
 * response đổi trả nên dòng hiện tóm tắt hàng + mã đơn.
 */
export function VendorReturnsTable() {
  const { filters, setFilter, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const { data, isLoading, isError, error } = useShopReturns({ status: filters.status, page, size: PAGE_SIZE });
  const now = useNow();

  const columns: ColumnDef<ShopReturnRequestResponse>[] = useMemo(
    () => [
      {
        accessorKey: "orderCode",
        header: "Đơn hàng",
        cell: ({ row }) => (
          <div className="min-w-0 leading-tight">
            <Link href={detailHref(row.original.id)} className="font-mono text-sm font-semibold hover:underline">
              {row.original.orderCode}
            </Link>
            <p className="max-w-56 truncate text-xs text-muted-foreground">{returnItemSummary(row.original)}</p>
          </div>
        ),
      },
      {
        id: "reason",
        header: "Lý do",
        cell: ({ row }) => <span className="text-sm">{RETURN_REASON_LABEL[row.original.reasonCode] ?? row.original.reasonCode}</span>,
      },
      {
        id: "refund",
        header: "Hoàn tiền",
        cell: ({ row }) =>
          row.original.codReversed ? <span className="text-sm text-muted-foreground">Đảo ghi thu COD</span> : <span className="font-medium">{row.original.refundAmount.display}</span>,
      },
      { id: "status", header: "Trạng thái", cell: ({ row }) => <StatusCell request={row.original} /> },
      {
        id: "deadline",
        header: "Hạn xử lý",
        cell: ({ row }) => <ReturnDeadline deadlineAt={row.original.deadlineAt} deadlineKind={row.original.deadlineKind} now={now} compact />,
      },
      {
        accessorKey: "createdAt",
        header: "Gửi lúc",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <ActionChip request={row.original} />
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={detailHref(row.original.id)} />}>
              Chi tiết
            </Button>
          </div>
        ),
      },
    ],
    [now],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  const rows = data?.content ?? [];
  const pageCount = data?.totalPages || 1;

  return (
    <div className="flex flex-col gap-3">
      <FilterTabs tabs={SHOP_RETURN_TABS} value={filters.status} onChange={(v) => setFilter("status", v)} />
      {isError ? <ApiErrorState error={error} fallback={LOAD_ERROR} compact /> : null}

      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={rows}
          loading={isLoading}
          serverPagination={{
            pageIndex,
            pageSize: PAGE_SIZE,
            pageCount,
            total: data?.totalElements ?? 0,
            onPageChange: setPageIndex,
          }}
        />
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {isLoading ? (
          <ReturnCardsSkeleton />
        ) : rows.length ? (
          rows.map((r) => <ReturnCard key={r.id} request={r} now={now} />)
        ) : (
          <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">Không có yêu cầu đổi trả nào.</p>
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
      </div>
    </div>
  );
}
