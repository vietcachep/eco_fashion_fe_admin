"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { EyeIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { isForbiddenError } from "@/lib/api-error";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDateTime, formatNumber } from "@/lib/format";
import { RECEIPT_STATUS, statusMeta } from "@/lib/labels";
import { useListState } from "@/hooks/use-list-state";
import { useReceipts } from "@/features/product/hooks/use-inventory";
import type { StockReceiptResponse } from "@/lib/api/generated/model";

const TABS = [
  { key: "", label: "Tất cả" },
  { key: "draft", label: "Nháp" },
  { key: "posted", label: "Đã ghi sổ" },
  { key: "cancelled", label: "Đã huỷ" },
] as const;

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được phiếu nhập.";
const DEFAULTS = { status: "" };

/* Danh sách phiếu nhập kho: mã, NCC, số dòng, tổng vốn, trạng thái. */
export function ReceiptsTable() {
  const { filters, setFilter, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const { data, isLoading, isError, error } = useReceipts({ status: filters.status, page, size: PAGE_SIZE });

  const columns: ColumnDef<StockReceiptResponse>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: "Mã phiếu",
        cell: ({ row }) => (
          <Link href={`${ROUTES.product.receipts}/${row.original.id}`} className="font-mono text-sm font-medium hover:underline">
            {row.original.code}
          </Link>
        ),
      },
      { accessorKey: "supplierName", header: "Nhà cung cấp", cell: ({ row }) => row.original.supplierName || "—" },
      {
        id: "items",
        header: "Số dòng / SL",
        cell: ({ row }) => `${row.original.items.length} / ${formatNumber(row.original.items.reduce((s, i) => s + i.quantity, 0))}`,
      },
      { id: "total", header: "Tổng vốn", cell: ({ row }) => row.original.totalCost.display },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const m = statusMeta(RECEIPT_STATUS, row.original.status);
          return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
        },
      },
      {
        id: "dates",
        header: "Tạo / ghi sổ",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDateTime(row.original.createdAt)}
            {row.original.postedAt ? ` → ${formatDateTime(row.original.postedAt)}` : ""}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" nativeButton={false} className="h-8" render={<Link href={`${ROUTES.product.receipts}/${row.original.id}`} />}>
              <EyeIcon className="size-3.5" />
              Chi tiết
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterTabs tabs={TABS} value={filters.status} onChange={(v) => setFilter("status", v)} />
        <PermissionGate permission={PERMISSIONS.inventoryReceive}>
          <Button nativeButton={false} render={<Link href={ROUTES.product.receiptNew} />}>
            <PlusIcon className="size-4" />
            Lập phiếu nhập
          </Button>
        </PermissionGate>
      </div>
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
