"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLinkIcon } from "lucide-react";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { DataTable } from "@/components/shared/data-table";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { useListState } from "@/hooks/use-list-state";
import { isForbiddenError } from "@/lib/api-error";
import { ROUTES } from "@/lib/constants";
import { formatDateTime, formatVnd } from "@/lib/format";
import { DEPOSIT_STATUS, statusMeta, VENDOR_WALLET_TX_TYPE_LABEL } from "@/lib/labels";
import type { DepositRequestResponse } from "@/lib/api/generated/model";
import { useMyShopDepositRequests, useMyShopWalletTransactions } from "@/features/shop/hooks/use-shop-wallet";
import { SignedMoney } from "@/features/shop/components/vendor/signed-money";
import type { ShopWalletTransactionResponse } from "@/features/shop/types/shop-wallet";

const PAGE_SIZE = 10;
const TABS = [
  { key: "ledger", label: "Sổ cái ví" },
  { key: "deposits", label: "Yêu cầu nộp quỹ" },
] as const;
const DEFAULTS = { tab: "ledger" };

/*
 * Lịch sử ví quỹ COD: sổ cái (mọi biến động số dư, mới nhất trước) và các yêu cầu nộp quỹ đã gửi. Tab đồng bộ URL
 * (?tab=deposits) nên dashboard/thông báo link thẳng được; mỗi tab là một bảng riêng chỉ gọi API khi đang xem.
 */
export function ShopWalletHistory() {
  const { filters, setFilter, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const tab = filters.tab === "deposits" ? "deposits" : "ledger";

  return (
    <div className="flex flex-col gap-3">
      <FilterTabs tabs={TABS} value={tab} onChange={(v) => setFilter("tab", v)} />
      {tab === "deposits" ? (
        <DepositRequestsTable page={page} pageIndex={pageIndex} onPageChange={setPageIndex} />
      ) : (
        <LedgerTable page={page} pageIndex={pageIndex} onPageChange={setPageIndex} />
      )}
    </div>
  );
}

interface TableProps {
  page: number;
  pageIndex: number;
  onPageChange: (pageIndex: number) => void;
}

function LedgerTable({ page, pageIndex, onPageChange }: TableProps) {
  const { data, isLoading, isError, error } = useMyShopWalletTransactions({ page, size: PAGE_SIZE });
  const loadError = "Không tải được sổ cái ví.";

  const columns: ColumnDef<ShopWalletTransactionResponse>[] = useMemo(
    () => [
      {
        id: "createdAt",
        header: "Thời gian",
        cell: ({ row }) => <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>,
      },
      {
        id: "type",
        header: "Nội dung",
        cell: ({ row }) => {
          const t = row.original;
          const meta = statusMeta(VENDOR_WALLET_TX_TYPE_LABEL, t.type);
          return (
            <div className="flex min-w-0 flex-col items-start gap-0.5">
              <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
              {t.type === "cod_commission" && t.orderCode ? (
                <Link href={`${ROUTES.vendor.orders}/${t.orderCode}`} className="font-mono text-xs hover:underline">
                  {t.orderCode}
                </Link>
              ) : (
                // cod_refund: orderCode là mã dòng hoàn RF-…, đơn gốc nằm trong note → chỉ hiện note.
                <span className="max-w-72 text-xs text-muted-foreground">{t.note ?? ""}</span>
              )}
            </div>
          );
        },
      },
      { id: "amount", header: () => <span className="block text-right">Biến động</span>, cell: ({ row }) => <div className="text-right"><SignedMoney value={row.original.amount} /></div> },
      {
        id: "balanceAfter",
        header: () => <span className="block text-right">Số dư sau</span>,
        cell: ({ row }) => <div className="text-right text-sm tabular-nums">{formatVnd(row.original.balanceAfter)}</div>,
      },
    ],
    [],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={loadError} />;

  return (
    <>
      {isError ? <ApiErrorState error={error} fallback={loadError} compact /> : null}
      <DataTable
        columns={columns}
        data={data?.content ?? []}
        loading={isLoading}
        serverPagination={{
          pageIndex,
          pageSize: PAGE_SIZE,
          pageCount: data?.totalPages || 1,
          total: data?.totalElements ?? 0,
          onPageChange,
        }}
      />
    </>
  );
}

function DepositRequestsTable({ page, pageIndex, onPageChange }: TableProps) {
  const { data, isLoading, isError, error } = useMyShopDepositRequests({ page, size: PAGE_SIZE });
  const loadError = "Không tải được lịch sử nộp quỹ.";

  const columns: ColumnDef<DepositRequestResponse>[] = useMemo(
    () => [
      {
        id: "createdAt",
        header: "Gửi lúc",
        cell: ({ row }) => <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>,
      },
      { id: "amount", header: "Số tiền", cell: ({ row }) => <span className="font-medium tabular-nums">{formatVnd(row.original.amount)}</span> },
      {
        id: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const meta = statusMeta(DEPOSIT_STATUS, row.original.status);
          return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
        },
      },
      {
        id: "proof",
        header: "Chứng từ",
        cell: ({ row }) =>
          row.original.proofUrl ? (
            <a href={row.original.proofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Xem ảnh
              <ExternalLinkIcon className="size-3" />
            </a>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      { id: "note", header: "Ghi chú", cell: ({ row }) => <span className="block max-w-64 text-xs text-muted-foreground">{row.original.note ?? "—"}</span> },
    ],
    [],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={loadError} />;

  return (
    <>
      {isError ? <ApiErrorState error={error} fallback={loadError} compact /> : null}
      <DataTable
        columns={columns}
        data={data?.content ?? []}
        loading={isLoading}
        serverPagination={{
          pageIndex,
          pageSize: PAGE_SIZE,
          pageCount: data?.totalPages || 1,
          total: data?.totalElements ?? 0,
          onPageChange,
        }}
      />
    </>
  );
}
