"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangleIcon, BoxesIcon, PackageXIcon, WarehouseIcon } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { NativeSelect } from "@/components/shared/native-select";
import { StatCard } from "@/components/shared/stat-card";
import { ROUTES } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { useInventorySummary, useLowStock } from "@/features/reporting/hooks/use-reports";
import type { LowStockRow } from "@/features/reporting/types/reporting";

const LOAD_ERROR = "Không tải được báo cáo tồn kho.";

/* Tổng quan tồn kho (số SP / biến thể, tồn, giữ, giá trị) + bảng biến thể sắp hết theo ngưỡng. */
export function InventoryReportScreen() {
  const [threshold, setThreshold] = useState(5);
  const summary = useInventorySummary();
  const low = useLowStock({ threshold, limit: 200 });

  const columns: ColumnDef<LowStockRow>[] = useMemo(
    () => [
      {
        accessorKey: "productName",
        header: "Sản phẩm / biến thể",
        cell: ({ row }) => (
          <div className="leading-tight">
            <Link href={`${ROUTES.product.products}/${row.original.productId}`} className="font-medium hover:underline">
              {row.original.productName}
            </Link>
            <p className="text-xs text-muted-foreground">
              {row.original.colorName} · {row.original.sizeCode} · <code className="font-mono">{row.original.sku}</code>
            </p>
          </div>
        ),
      },
      { accessorKey: "stock", header: "Tồn", cell: ({ row }) => formatNumber(row.original.stock) },
      { accessorKey: "reserved", header: "Giữ", cell: ({ row }) => formatNumber(row.original.reserved) },
      {
        accessorKey: "available",
        header: "Khả dụng",
        cell: ({ row }) => (
          <span className={row.original.available <= 0 ? "font-semibold text-destructive" : "font-semibold text-amber-700"}>
            {formatNumber(row.original.available)}
          </span>
        ),
      },
    ],
    [],
  );

  if (summary.error) return <ApiErrorState error={summary.error} fallback={LOAD_ERROR} />;
  const s = summary.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sản phẩm / biến thể" value={s ? `${formatNumber(s.products)} / ${formatNumber(s.variants)}` : "—"} icon={BoxesIcon} loading={summary.isPending} />
        <StatCard label="Đơn vị tồn kho" value={formatNumber(s?.unitsInStock)} hint={s ? `Đang giữ cho đơn ${formatNumber(s.unitsReserved)}` : undefined} icon={WarehouseIcon} loading={summary.isPending} />
        <StatCard label="Giá trị tồn (giá bán)" value={s?.stockValue.display ?? "—"} tone="primary" loading={summary.isPending} />
        <StatCard label="Sắp hết / hết hàng" value={s ? `${formatNumber(s.lowStock)} / ${formatNumber(s.outOfStock)}` : "—"} icon={s && s.outOfStock > 0 ? PackageXIcon : AlertTriangleIcon} tone={s && s.outOfStock > 0 ? "danger" : "warning"} loading={summary.isPending} />
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span>Biến thể có khả dụng ≤</span>
        <NativeSelect aria-label="Ngưỡng" className="w-24" value={String(threshold)} onChange={(e) => setThreshold(Number(e.target.value))}>
          {[0, 3, 5, 10, 20].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </NativeSelect>
        <Link href={ROUTES.product.receiptNew} className="ml-auto text-primary hover:underline">
          Lập phiếu nhập →
        </Link>
      </div>
      {low.error ? <ApiErrorState error={low.error} fallback="Không tải được danh sách sắp hết." compact /> : null}
      <DataTable columns={columns} data={low.data ?? []} loading={low.isPending} pageSize={20} searchPlaceholder="Tìm sản phẩm / SKU…" />
    </div>
  );
}
