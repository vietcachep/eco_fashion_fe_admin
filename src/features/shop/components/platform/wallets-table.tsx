"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { WalletIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { DataTable } from "@/components/shared/data-table";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { isForbiddenError } from "@/lib/api-error";
import { ROUTES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { useListState } from "@/hooks/use-list-state";
import { CodBadge, ShopIdentity, WalletBalance } from "@/features/shop/components/platform/shop-cells";
import { useAdminWallets } from "@/features/shop/hooks/use-admin-wallets";
import type { AdminWalletRow } from "@/features/shop/types/admin-shop";

const TABS = [
  { key: "", label: "Tất cả" },
  { key: "low", label: "COD đang bị khoá (ví ≤ 0)" },
] as const;

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được danh sách ví quỹ COD.";
const DEFAULTS = { scope: "" };

/*
 * Ví quỹ COD của các shop (quyền supplier.wallet.read). Sàn thu hoa hồng đơn COD bằng cách trừ ví
 * này; ví ≤ 0 thì COD của shop bị khoá tới khi nộp quỹ. Tab "COD đang bị khoá" là danh sách cần
 * đòi nộp quỹ; bấm dòng để mở thẳng tab ví của shop (sổ cái, điều chỉnh).
 */
export function WalletsTable() {
  const { filters, setFilter, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const { data, isLoading, isError, error } = useAdminWallets({ lowOnly: filters.scope === "low", page, size: PAGE_SIZE });

  const columns: ColumnDef<AdminWalletRow>[] = useMemo(
    () => [
      {
        id: "shop",
        header: "Gian hàng",
        cell: ({ row }) => <ShopIdentity id={row.original.shopId} name={row.original.shopName} tab="wallet" />,
      },
      { id: "balance", header: "Số dư quỹ", cell: ({ row }) => <WalletBalance balance={row.original.balance} /> },
      { id: "cod", header: "COD", cell: ({ row }) => <CodBadge enabled={row.original.codEnabled} /> },
      {
        id: "updatedAt",
        header: "Cập nhật",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.updatedAt)}</span>,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              className="h-8"
              render={<Link href={`${ROUTES.shop.shops}/${row.original.shopId}?tab=wallet`} />}
            >
              <WalletIcon className="size-3.5" />
              Xem ví
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
      <FilterTabs tabs={TABS} value={filters.scope} onChange={(v) => setFilter("scope", v)} />
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
