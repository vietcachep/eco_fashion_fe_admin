"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { EyeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { formatVnd } from "@/lib/format";
import type { ShopPayoutResponse } from "@/lib/api/generated/model";
import { NetPayoutAmount, PayoutPeriod, PayoutStatusBadge } from "@/features/shop/components/platform/payout-cells";

/*
 * Bảng kỳ đối soát — chỉ trình bày; màn cha (`PayoutsScreen`, tab "Đối soát" của
 * chi tiết shop) giữ dữ liệu, trang, bộ lọc. Danh sách payout KHÔNG kèm tên shop nên
 * màn cha truyền `shopLabel` để dịch `shopId` → tên; tab trong chi tiết shop đã biết
 * shop nên ẩn cột (`shopLabel` bỏ trống).
 */
export function PayoutsTable({
  data,
  loading,
  shopLabel,
  serverPagination,
  onOpen,
}: {
  data: ShopPayoutResponse[];
  loading: boolean;
  shopLabel?: (shopId: string) => string;
  serverPagination: { pageIndex: number; pageSize: number; pageCount: number; total: number; onPageChange: (pageIndex: number) => void };
  onOpen: (payout: ShopPayoutResponse) => void;
}) {
  const columns: ColumnDef<ShopPayoutResponse>[] = useMemo(() => {
    const cols: ColumnDef<ShopPayoutResponse>[] = [
      {
        accessorKey: "code",
        header: "Mã kỳ",
        cell: ({ row }) => (
          <button type="button" className="font-mono text-sm font-semibold hover:underline" onClick={() => onOpen(row.original)}>
            {row.original.code}
          </button>
        ),
      },
    ];
    if (shopLabel) cols.push({ id: "shop", header: "Gian hàng", cell: ({ row }) => <span className="font-medium">{shopLabel(row.original.shopId)}</span> });
    cols.push(
      { id: "period", header: "Kỳ đối soát", cell: ({ row }) => <PayoutPeriod start={row.original.periodStart} end={row.original.periodEnd} /> },
      { id: "gross", header: "Doanh thu", cell: ({ row }) => <span className="tabular-nums">{formatVnd(row.original.grossRevenue)}</span> },
      { id: "commission", header: "Hoa hồng", cell: ({ row }) => <span className="tabular-nums">{formatVnd(row.original.commission)}</span> },
      { id: "refund", header: "Hoàn tiền", cell: ({ row }) => <span className="tabular-nums">{formatVnd(row.original.refundAmount)}</span> },
      { id: "debt", header: "Nợ mang sang", cell: ({ row }) => <span className="tabular-nums">{formatVnd(row.original.carriedDebt)}</span> },
      { id: "net", header: "Thực chi", cell: ({ row }) => <NetPayoutAmount value={row.original.netPayout} /> },
      { id: "status", header: "Trạng thái", cell: ({ row }) => <PayoutStatusBadge status={row.original.status} /> },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="h-8" onClick={() => onOpen(row.original)}>
              <EyeIcon className="size-3.5" />
              Chi tiết
            </Button>
          </div>
        ),
      },
    );
    return cols;
  }, [shopLabel, onOpen]);

  return <DataTable columns={columns} data={data} loading={loading} serverPagination={serverPagination} />;
}
