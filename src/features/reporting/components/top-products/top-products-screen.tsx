"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ImageIcon, Loader2Icon } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { NativeSelect } from "@/components/shared/native-select";
import { ROUTES } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { useTopProducts } from "@/features/reporting/hooks/use-reports";
import { DateRangePicker, defaultRange, type DateRange } from "@/features/reporting/components/shared/date-range-picker";
import type { TopProductRow } from "@/features/reporting/types/reporting";

const LOAD_ERROR = "Không tải được sản phẩm bán chạy.";

/* Bán chạy trong kỳ: số lượng, doanh thu, số đơn — link sang sản phẩm. */
export function TopProductsScreen() {
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [limit, setLimit] = useState(20);
  const { data, isPending, error, isFetching } = useTopProducts({ ...range, limit });

  const columns: ColumnDef<TopProductRow>[] = useMemo(
    () => [
      { id: "rank", header: "#", cell: ({ row }) => <span className="text-sm font-semibold text-muted-foreground">{row.index + 1}</span> },
      {
        accessorKey: "name",
        header: "Sản phẩm",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
              {row.original.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- ảnh động
                <img src={row.original.imageUrl} alt="" className="size-full object-cover" />
              ) : (
                <ImageIcon className="size-4 text-muted-foreground/60" />
              )}
            </div>
            <Link href={`${ROUTES.product.products}/${row.original.productId}`} className="font-medium hover:underline">
              {row.original.name}
            </Link>
          </div>
        ),
      },
      { accessorKey: "quantity", header: "Đã bán", cell: ({ row }) => formatNumber(row.original.quantity) },
      { accessorKey: "orderCount", header: "Số đơn", cell: ({ row }) => formatNumber(row.original.orderCount) },
      { id: "revenue", header: "Doanh thu", cell: ({ row }) => <span className="font-medium">{row.original.revenue.display}</span> },
    ],
    [],
  );

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker value={range} onChange={setRange} />
        <NativeSelect aria-label="Số dòng" className="w-28" value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))}>
          {[10, 20, 50].map((n) => (
            <option key={n} value={n}>
              Top {n}
            </option>
          ))}
        </NativeSelect>
        {isFetching ? <Loader2Icon className="size-4 animate-spin text-muted-foreground" /> : null}
      </div>
      <DataTable columns={columns} data={data ?? []} loading={isPending} pageSize={50} />
    </div>
  );
}
