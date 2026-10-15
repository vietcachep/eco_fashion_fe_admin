"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { EllipsisIcon, EyeIcon, StarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { DataTable } from "@/components/shared/data-table";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { isForbiddenError } from "@/lib/api-error";
import { ROUTES } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/format";
import type { AdminShopSummaryResponse } from "@/lib/api/generated/model";
import { useListState } from "@/hooks/use-list-state";
import { formatCommissionRate, ShopIdentity, ShopStatusBadge } from "@/features/shop/components/platform/shop-cells";
import {
  ShopActionDialogs,
  useShopActionItems,
  type ShopAction,
  type ShopActionKind,
} from "@/features/shop/components/platform/shop-actions";
import { useAdminShops } from "@/features/shop/hooks/use-admin-shops";

const TABS = [
  { key: "", label: "Tất cả" },
  { key: "pending", label: "Chờ duyệt" },
  { key: "approved", label: "Đang hoạt động" },
  { key: "suspended", label: "Tạm khoá" },
  { key: "rejected", label: "Từ chối" },
] as const;

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được danh sách gian hàng.";
const DEFAULTS = { status: "" };

/* Chủ shop: backend trả sẵn tên/email trong dòng danh sách (null khi tài khoản chủ không còn) — không tra thêm từng người. */
function ShopOwnerCell({ name, email }: { name?: string | null; email?: string | null }) {
  if (!name && !email) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="min-w-0 leading-tight">
      <p className="truncate">{name ?? "—"}</p>
      {email ? <p className="truncate text-xs text-muted-foreground">{email}</p> : null}
    </div>
  );
}

/* Cột thao tác: "Chi tiết" + menu "⋯" gom các thao tác theo trạng thái & quyền. */
function ShopRowActions({ shop, onAction }: { shop: AdminShopSummaryResponse; onAction: (kind: ShopActionKind, shop: AdminShopSummaryResponse) => void }) {
  const items = useShopActionItems(shop);
  return (
    <div className="flex justify-end gap-1.5">
      <Button variant="outline" size="sm" nativeButton={false} className="h-8" render={<Link href={`${ROUTES.shop.shops}/${shop.id}`} />}>
        <EyeIcon className="size-3.5" />
        Chi tiết
      </Button>
      {items.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="icon" className="size-8" aria-label="Thao tác khác" />}>
            <EllipsisIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {items.map((item, i) => (
              <div key={item.kind}>
                {item.destructive && i > 0 ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem variant={item.destructive ? "destructive" : "default"} onClick={() => onAction(item.kind, shop)}>
                  <item.icon />
                  {item.label}
                </DropdownMenuItem>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

/*
 * Danh sách gian hàng trên sàn (mọi shop, quyền supplier.shop.read): tìm theo
 * mã/tên/slug, lọc trạng thái, phân trang server. Duyệt / khoá / từ chối / sửa hoa
 * hồng làm ngay trong dòng (menu "⋯"), chi tiết + ví + đối soát ở trang riêng.
 */
export function ShopsTable() {
  const { filters, setFilter, search, setSearch, keyword, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const { data, isLoading, isError, error } = useAdminShops({
    status: filters.status || undefined,
    keyword,
    page,
    size: PAGE_SIZE,
  });
  const [action, setAction] = useState<ShopAction | null>(null);

  const columns: ColumnDef<AdminShopSummaryResponse>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Gian hàng",
        cell: ({ row }) => <ShopIdentity id={row.original.id} name={row.original.name} code={row.original.code} logoUrl={row.original.logoUrl} />,
      },
      { id: "owner", header: "Chủ shop", cell: ({ row }) => <ShopOwnerCell name={row.original.ownerName} email={row.original.ownerEmail} /> },
      { id: "status", header: "Trạng thái", cell: ({ row }) => <ShopStatusBadge status={row.original.status} /> },
      { id: "commission", header: "Hoa hồng", cell: ({ row }) => formatCommissionRate(row.original.commissionRate) },
      { id: "products", header: "Sản phẩm", cell: ({ row }) => formatNumber(row.original.totalProducts) },
      {
        id: "rating",
        header: "Đánh giá",
        cell: ({ row }) =>
          row.original.ratingAvg ? (
            <span className="inline-flex items-center gap-1">
              <StarIcon className="size-3.5 fill-amber-400 text-amber-400" />
              {Number(row.original.ratingAvg).toFixed(1)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "createdAt",
        header: "Ngày tạo",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => <ShopRowActions shop={row.original} onAction={(kind, shop) => setAction({ kind, shop })} />,
      },
    ],
    [],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-3">
      <FilterTabs tabs={TABS} value={filters.status} onChange={(v) => setFilter("status", v)} />
      {isError ? <ApiErrorState error={error} fallback={LOAD_ERROR} compact /> : null}
      <DataTable
        columns={columns}
        data={data?.content ?? []}
        loading={isLoading}
        searchPlaceholder="Tìm mã / tên / slug gian hàng…"
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
      <ShopActionDialogs action={action} onClose={() => setAction(null)} />
    </div>
  );
}
