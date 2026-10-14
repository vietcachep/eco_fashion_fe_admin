"use client";

import { useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { BanknoteIcon, ScaleIcon, SlidersHorizontalIcon, WalletIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { DataTable } from "@/components/shared/data-table";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDateTime, formatVnd } from "@/lib/format";
import { statusMeta, WALLET_TX_TYPE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { WalletAdjustDialog } from "@/features/shop/components/platform/wallet-adjust-dialog";
import { useAdminShopWallet, useAdminShopWalletTransactions } from "@/features/shop/hooks/use-admin-wallets";
import type { ShopWalletTransactionResponse } from "@/features/shop/types/shop-wallet";

const PAGE_SIZE = 10;
const LOAD_ERROR = "Không tải được ví quỹ COD của gian hàng.";

/* Âm = trừ ví (hoa hồng, hoàn tiền) tô đỏ; dương = cộng ví (nộp quỹ, điều chỉnh) tô xanh. */
function SignedAmount({ value }: { value: string }) {
  const n = Number(value);
  return (
    <span className={cn("font-semibold tabular-nums", n < 0 ? "text-destructive" : n > 0 ? "text-emerald-700 dark:text-emerald-400" : "")}>
      {n > 0 ? "+" : ""}
      {formatVnd(value)}
    </span>
  );
}

const columns: ColumnDef<ShopWalletTransactionResponse>[] = [
  { id: "createdAt", header: "Thời gian", cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.createdAt)}</span> },
  {
    id: "type",
    header: "Loại",
    cell: ({ row }) => {
      const meta = statusMeta(WALLET_TX_TYPE_LABEL, row.original.type);
      return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
    },
  },
  {
    id: "order",
    header: "Đơn / mã",
    cell: ({ row }) => (row.original.orderCode ? <span className="font-mono text-xs">{row.original.orderCode}</span> : <span className="text-muted-foreground">—</span>),
  },
  { id: "amount", header: "Số tiền", cell: ({ row }) => <SignedAmount value={row.original.amount} /> },
  { id: "balanceAfter", header: "Số dư sau", cell: ({ row }) => <span className="tabular-nums">{formatVnd(row.original.balanceAfter)}</span> },
  { id: "note", header: "Ghi chú", cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.note ?? "—"}</span> },
];

/* Giải thích VÌ SAO COD đang bật/khoá — luật backend: ví ≤ 0 ⇒ khoá COD, ví > 0 ⇒ mở. */
function codHint(codEnabled: boolean, balance: number): string {
  if (codEnabled) return "Ví quỹ > 0 nên shop nhận được đơn COD";
  if (balance <= 0) return "Ví ≤ 0 nên COD tự khoá — shop cần nộp quỹ";
  return "Ví > 0 nhưng COD đang tắt — kiểm tra trạng thái gian hàng";
}

/*
 * Tab "Ví quỹ COD" ở chi tiết shop: số dư, COD bật/khoá (+ lý do), yêu cầu nộp quỹ đang chờ và
 * sổ cái phân trang. Sàn thu hoa hồng đơn COD bằng cách TRỪ ví này; ví ≤ 0 thì COD của shop khoá
 * cho tới khi shop nộp quỹ hoặc sàn điều chỉnh ví.
 */
export function ShopWalletTab({ shopId, shopName }: { shopId: string; shopName: string }) {
  const wallet = useAdminShopWallet(shopId);
  const [pageIndex, setPageIndex] = useState(0);
  const tx = useAdminShopWalletTransactions(shopId, { page: pageIndex + 1, size: PAGE_SIZE });
  const [adjustOpen, setAdjustOpen] = useState(false);

  const w = wallet.data;
  const balance = w ? Number(w.balance) : 0;

  return (
    <div className="flex flex-col gap-4">
      {wallet.isError ? <ApiErrorState error={wallet.error} fallback={LOAD_ERROR} compact /> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Số dư quỹ COD"
          value={w ? formatVnd(w.balance) : "—"}
          hint={w && balance <= 0 ? "Ví ≤ 0 — COD đang bị khoá" : "Hoa hồng đơn COD được trừ vào ví này"}
          icon={WalletIcon}
          tone={w && balance <= 0 ? "danger" : "success"}
          loading={wallet.isLoading}
        />
        <StatCard
          label="Đơn COD"
          value={w ? (w.codEnabled ? "Đang bật" : "Đang khoá") : "—"}
          hint={w ? codHint(w.codEnabled, balance) : undefined}
          icon={BanknoteIcon}
          tone={w && !w.codEnabled ? "danger" : "primary"}
          loading={wallet.isLoading}
        />
        <StatCard
          label="Yêu cầu nộp quỹ đang chờ"
          value={w?.pendingDeposit ? formatVnd(w.pendingDeposit.amount) : "Không có"}
          hint={
            w?.pendingDeposit ? (
              <Link href={`${ROUTES.shop.walletDeposits}?status=pending`} className="text-primary hover:underline">
                Xem &amp; duyệt yêu cầu
              </Link>
            ) : undefined
          }
          icon={ScaleIcon}
          tone={w?.pendingDeposit ? "warning" : "default"}
          loading={wallet.isLoading}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Sổ cái ví</h2>
        <PermissionGate permission={PERMISSIONS.supplierWalletAdjust}>
          <Button variant="outline" disabled={!w} onClick={() => setAdjustOpen(true)}>
            <SlidersHorizontalIcon className="size-4" />
            Điều chỉnh ví
          </Button>
        </PermissionGate>
      </div>

      {tx.isError ? <ApiErrorState error={tx.error} fallback="Không tải được sổ cái ví." compact /> : null}
      <DataTable
        columns={columns}
        data={tx.data?.content ?? []}
        loading={tx.isLoading}
        serverPagination={{
          pageIndex,
          pageSize: PAGE_SIZE,
          pageCount: tx.data?.totalPages || 1,
          total: tx.data?.totalElements ?? 0,
          onPageChange: setPageIndex,
        }}
      />

      {adjustOpen && w ? <WalletAdjustDialog shopId={shopId} shopName={shopName} balance={w.balance} onClose={() => setAdjustOpen(false)} /> : null}
    </div>
  );
}
