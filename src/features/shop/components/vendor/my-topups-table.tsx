"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime, formatVnd } from "@/lib/format";
import { statusMeta, TOPUP_STATUS } from "@/lib/labels";
import { useMyTopups } from "@/features/shop/hooks/use-wallet-topups";
import type { WalletTopup } from "@/features/shop/types/wallet-topup";

const PAGE_SIZE = 10;

/*
 * Lịch sử nạp tiền vào ví của gian hàng, mới nhất trước, phân trang phía server. Số tiền hiển thị đúng chuỗi backend trả,
 * không tự cộng trừ ở giao diện.
 */
export function MyTopupsTable() {
  const [pageIndex, setPageIndex] = useState(0);
  const { data, isLoading, error } = useMyTopups(pageIndex + 1, PAGE_SIZE);
  const columns: ColumnDef<WalletTopup>[] = useMemo(
    () => [
      {
        id: "at",
        header: "Thời gian",
        cell: ({ row }) => <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>,
      },
      {
        id: "amount",
        header: "Số tiền yêu cầu",
        cell: ({ row }) => <span className="font-medium tabular-nums">{formatVnd(row.original.amount)}</span>,
      },
      {
        id: "received",
        header: "Đã nhận",
        cell: ({ row }) => <span className="tabular-nums">{formatVnd(row.original.receivedAmount)}</span>,
      },
      {
        id: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const t = row.original;
          const m = statusMeta(TOPUP_STATUS, t.status);
          // Link đã đóng nhưng đã ghi có một phần: nói rõ số đã vào ví, để chủ shop không tưởng là mất tiền.
          const closedWithMoney = (t.status === "expired" || t.status === "cancelled") && Number(t.receivedAmount) > 0;
          return (
            <div className="flex flex-col gap-0.5">
              <StatusBadge tone={m.tone}>{m.label}</StatusBadge>
              {closedWithMoney ? (
                <span className="text-xs text-muted-foreground">
                  đã ghi có {formatVnd(t.receivedAmount)} / {formatVnd(t.amount)}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "code",
        header: "Mã giao dịch",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.payosOrderCode}</span>,
      },
    ],
    [],
  );

  if (error) return <ApiErrorState error={error} fallback="Không tải được lịch sử nạp tiền." />;

  return (
    <DataTable
      columns={columns}
      data={data?.content ?? []}
      loading={isLoading}
      serverPagination={{ pageIndex, pageSize: PAGE_SIZE, pageCount: data?.totalPages || 1, total: data?.totalElements ?? 0, onPageChange: setPageIndex }}
    />
  );
}
