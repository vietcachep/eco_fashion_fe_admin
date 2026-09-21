"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { EyeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { isForbiddenError } from "@/lib/api-error";
import { ROUTES } from "@/lib/constants";
import { formatDateTime, truncate } from "@/lib/format";
import { RETURN_STATUS, statusMeta } from "@/lib/labels";
import { useListState } from "@/hooks/use-list-state";
import { useAdminReturns } from "@/features/order/hooks/use-orders";
import type { ReturnRequestResponse } from "@/lib/api/generated/model";

const TABS = [
  { key: "", label: "Tất cả" },
  { key: "requested", label: "Chờ duyệt" },
  { key: "approved", label: "Đã duyệt" },
  { key: "rejected", label: "Từ chối" },
  { key: "refunded", label: "Đã hoàn tiền" },
] as const;

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được yêu cầu đổi trả.";
const DEFAULTS = { status: "" };

/* Yêu cầu đổi trả của khách: đơn, lý do, số tiền hoàn dự kiến, trạng thái. */
export function ReturnsTable() {
  const { filters, setFilter, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const { data, isLoading, isError, error } = useAdminReturns({ status: filters.status, page, size: PAGE_SIZE });

  const columns: ColumnDef<ReturnRequestResponse>[] = useMemo(
    () => [
      {
        accessorKey: "orderCode",
        header: "Đơn hàng",
        cell: ({ row }) => (
          <Link href={`${ROUTES.order.orders}/${row.original.orderCode}`} className="font-mono text-sm font-semibold hover:underline">
            {row.original.orderCode}
          </Link>
        ),
      },
      {
        id: "items",
        header: "Hàng trả",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.items.length} dòng · {row.original.items.reduce((s, i) => s + i.quantity, 0)} sp
          </span>
        ),
      },
      { accessorKey: "reason", header: "Lý do", cell: ({ row }) => <span title={row.original.detail ?? ""}>{truncate(row.original.reason, 50)}</span> },
      { id: "refund", header: "Hoàn tiền", cell: ({ row }) => row.original.refundAmount.display },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const m = statusMeta(RETURN_STATUS, row.original.status);
          return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
        },
      },
      { accessorKey: "createdAt", header: "Gửi lúc", cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.createdAt)}</span> },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" nativeButton={false} className="h-8" render={<Link href={`${ROUTES.order.returns}/${row.original.id}`} />}>
              <EyeIcon className="size-3.5" />
              Xử lý
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-3">
      <FilterTabs tabs={TABS} value={filters.status} onChange={(v) => setFilter("status", v)} />
      {isError ? <ApiErrorState error={error} fallback={LOAD_ERROR} compact /> : null}
      <DataTable
        columns={columns}
        data={data?.content ?? []}
        loading={isLoading}
        serverPagination={{
          pageIndex,
          pageSize: PAGE_SIZE,
          pageCount: data?.totalPages || 1,
          total: data?.totalElements ?? 0,
          onPageChange: setPageIndex,
        }}
      />
    </div>
  );
}
