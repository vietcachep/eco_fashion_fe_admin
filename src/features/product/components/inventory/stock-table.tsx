"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { HistoryIcon, PlusIcon, SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { isForbiddenError } from "@/lib/api-error";
import { formatNumber } from "@/lib/format";
import { useListState } from "@/hooks/use-list-state";
import { usePermission } from "@/hooks/use-permission";
import { useStock } from "@/features/product/hooks/use-inventory";
import { StockMovementsDialog } from "@/features/product/components/inventory/stock-movements-dialog";
import { AdjustStockDialog } from "@/features/product/components/inventory/adjust-stock-dialog";
import { INVENTORY_SCOPES, variantLabel, type InventoryScope } from "@/features/product/types/inventory";
import type { StockRowResponse } from "@/lib/api/generated/model";

const TABS = [
  { key: "", label: "Tất cả biến thể" },
  { key: "low", label: "Sắp hết hàng" },
] as const;

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được tồn kho.";
const DEFAULTS = { low: "" };

/*
 * Tồn kho theo biến thể: tồn / giữ cho đơn / khả dụng, cờ sắp hết. Hành động:
 * xem sổ kho (movements) và điều chỉnh (kiểm kê, hỏng, mất) — nhập hàng đi
 * đường phiếu nhập. `scope` chọn kho toàn sàn hay chỉ kho của shop mình.
 */
export function StockTable({ scope }: { scope: InventoryScope }) {
  const cfg = INVENTORY_SCOPES[scope];
  const canOpenProduct = usePermission(cfg.permissions.productRead);
  const { filters, setFilter, search, setSearch, keyword, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const [movements, setMovements] = useState<StockRowResponse | null>(null);
  const [adjust, setAdjust] = useState<StockRowResponse | null>(null);

  const { data, isLoading, isError, error } = useStock(scope, {
    keyword,
    lowStockOnly: filters.low === "low",
    page,
    size: PAGE_SIZE,
  });

  const columns: ColumnDef<StockRowResponse>[] = useMemo(
    () => [
      {
        accessorKey: "productName",
        header: `Sản phẩm / ${cfg.variantHeader.toLowerCase()}`,
        cell: ({ row }) => {
          const r = row.original;
          const label = variantLabel(r);
          return (
            <div className="min-w-44 leading-tight">
              {canOpenProduct ? (
                <Link href={`${cfg.routes.products}/${r.productId}`} className="font-medium hover:underline">
                  {r.productName}
                </Link>
              ) : (
                <span className="font-medium">{r.productName}</span>
              )}
              <p className="text-xs text-muted-foreground">
                {label ? `${label} · ` : ""}
                <code className="font-mono">{r.sku}</code>
              </p>
            </div>
          );
        },
      },
      { accessorKey: "stock", header: "Tồn", cell: ({ row }) => formatNumber(row.original.stock) },
      { accessorKey: "reserved", header: "Giữ cho đơn", cell: ({ row }) => formatNumber(row.original.reserved) },
      {
        accessorKey: "available",
        header: "Khả dụng",
        cell: ({ row }) => (
          <span className={row.original.available <= 0 ? "font-semibold text-destructive" : "font-semibold"}>
            {formatNumber(row.original.available)}
          </span>
        ),
      },
      {
        id: "flag",
        header: "Trạng thái",
        cell: ({ row }) => {
          const r = row.original;
          if (!r.isActive) return <StatusBadge tone="neutral">Ngừng bán</StatusBadge>;
          if (r.available <= 0) return <StatusBadge tone="danger">Hết hàng</StatusBadge>;
          if (r.isLow) return <StatusBadge tone="warning">Sắp hết</StatusBadge>;
          return <StatusBadge tone="success">Còn hàng</StatusBadge>;
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" className="h-8" onClick={() => setMovements(row.original)}>
              <HistoryIcon className="size-3.5" />
              Sổ kho
            </Button>
            <PermissionGate permission={cfg.permissions.adjust}>
              <Button variant="outline" size="sm" className="h-8" onClick={() => setAdjust(row.original)}>
                <SlidersHorizontalIcon className="size-3.5" />
                Điều chỉnh
              </Button>
            </PermissionGate>
          </div>
        ),
      },
    ],
    [cfg, canOpenProduct],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterTabs tabs={TABS} value={filters.low} onChange={(v) => setFilter("low", v)} />
        <PermissionGate permission={cfg.permissions.receive}>
          <Button size="sm" nativeButton={false} render={<Link href={cfg.routes.receiptNew} />}>
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
        searchPlaceholder="Tìm theo tên sản phẩm / SKU…"
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
      <StockMovementsDialog scope={scope} row={movements} onClose={() => setMovements(null)} />
      <AdjustStockDialog scope={scope} row={adjust} onClose={() => setAdjust(null)} />
    </div>
  );
}
