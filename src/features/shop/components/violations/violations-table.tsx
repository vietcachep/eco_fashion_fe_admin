"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime } from "@/lib/format";
import { SHOP_VIOLATION_KIND, statusMeta } from "@/lib/labels";
import type { ShopViolation } from "@/features/shop/types/violation";

/*
 * Bảng lịch sử điểm vi phạm (mới nhất trước), phân trang server. Thuần trình bày: cổng vendor và tab "Vi phạm" của sàn cùng dùng,
 * mỗi nơi tự cấp dữ liệu qua hook của mình và đường dẫn tới đơn (`orderHref`) — vendor sang /vendor/orders, sàn sang /order/orders.
 * Nhãn loại lấy `kindLabel` backend trả (nguồn sự thật), chỉ mượn bảng `SHOP_VIOLATION_KIND` để tô màu và làm nhãn dự phòng.
 */
export function ViolationsTable({
  rows,
  loading,
  orderHref,
  pageIndex,
  pageSize,
  pageCount,
  total,
  onPageChange,
}: {
  rows: ShopViolation[];
  loading: boolean;
  orderHref: (orderCode: string) => string;
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  total: number;
  onPageChange: (pageIndex: number) => void;
}) {
  const columns: ColumnDef<ShopViolation>[] = useMemo(
    () => [
      {
        id: "createdAt",
        header: "Thời điểm",
        cell: ({ row }) => <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>,
      },
      {
        id: "kind",
        header: "Loại vi phạm",
        cell: ({ row }) => {
          const meta = statusMeta(SHOP_VIOLATION_KIND, row.original.kind);
          return <StatusBadge tone={meta.tone}>{row.original.kindLabel || meta.label}</StatusBadge>;
        },
      },
      {
        id: "order",
        header: "Đơn hàng",
        cell: ({ row }) => (
          <Link href={orderHref(row.original.orderCode)} className="font-mono text-sm font-semibold hover:underline">
            {row.original.orderCode}
          </Link>
        ),
      },
      {
        id: "points",
        header: "Điểm",
        cell: ({ row }) => <span className="font-semibold tabular-nums text-destructive">+{row.original.points}</span>,
      },
    ],
    [orderHref],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      loading={loading}
      serverPagination={{ pageIndex, pageSize, pageCount: pageCount || 1, total, onPageChange }}
    />
  );
}
