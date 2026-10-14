"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { EyeIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { NativeSelect } from "@/components/shared/native-select";
import { PermissionGate } from "@/components/shared/permission-gate";
import { isForbiddenError } from "@/lib/api-error";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/format";
import { PROMO_TYPE_LABEL, PROMOTION_SCOPE_LABEL } from "@/lib/labels";
import { useListState } from "@/hooks/use-list-state";
import { useAdminPromotions } from "@/features/promotion/hooks/use-promotions";
import { usePromotionShopNames } from "@/features/promotion/hooks/use-promotion-shop-names";
import { describeDiscount, PromotionPhaseBadge, PromotionScopeBadge } from "@/features/promotion/components/common/promotion-display";
import type { PromotionAdminResponse } from "@/features/promotion/types/promotion";

const TABS = [
  { key: "", label: "Tất cả" },
  { key: "active", label: "Đang bật" },
  { key: "inactive", label: "Đang tắt" },
] as const;

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được mã khuyến mãi.";
const DEFAULTS = { active: "", scope: "" };

/*
 * Mã khuyến mãi: mã SÀN (sàn chịu giảm giá, áp cả giỏ) và mã GIAN HÀNG (shop chịu,
 * chỉ áp đơn con của shop đó — vendor tự tạo). Sàn xem được cả hai; cột "Phạm vi"
 * + bộ lọc phạm vi giúp tách hai nhóm. Tạo mã ở đây luôn là mã sàn.
 */
export function PromotionsTable() {
  const { filters, setFilter, search, setSearch, keyword, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const { data, isLoading, isError, error } = useAdminPromotions({
    keyword,
    active: filters.active === "active" ? true : filters.active === "inactive" ? false : undefined,
    scope: filters.scope === "platform" || filters.scope === "shop" ? filters.scope : undefined,
    page,
    size: PAGE_SIZE,
  });
  const shopNames = usePromotionShopNames().data;

  const columns: ColumnDef<PromotionAdminResponse>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: "Mã",
        cell: ({ row }) => (
          <div className="leading-tight">
            <Link href={`${ROUTES.promotion.promotions}/${row.original.id}`} className="font-mono text-sm font-semibold hover:underline">
              {row.original.code}
            </Link>
            <p className="text-xs text-muted-foreground">{row.original.name}</p>
          </div>
        ),
      },
      {
        id: "scope",
        header: "Phạm vi",
        cell: ({ row }) => <PromotionScopeBadge promotion={row.original} shopName={row.original.shopId ? shopNames?.get(row.original.shopId) : null} />,
      },
      {
        id: "discount",
        header: "Mức giảm",
        cell: ({ row }) => (
          <div className="leading-tight">
            <p>{describeDiscount(row.original)}</p>
            <p className="text-xs text-muted-foreground">
              {PROMO_TYPE_LABEL[row.original.type] ?? row.original.type}
              {row.original.displayMinOrderAmount ? ` · đơn từ ${row.original.displayMinOrderAmount.display}` : ""}
            </p>
          </div>
        ),
      },
      {
        id: "usage",
        header: "Lượt dùng",
        cell: ({ row }) => `${formatNumber(row.original.usedCount)}${row.original.usageLimit ? ` / ${formatNumber(row.original.usageLimit)}` : ""}`,
      },
      {
        id: "period",
        header: "Hiệu lực",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.startAt)} → {formatDate(row.original.endAt)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Trạng thái",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            <PromotionPhaseBadge promotion={row.original} />
            {!row.original.isPublic ? <Badge variant="outline">Ẩn (nhập tay)</Badge> : null}
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" nativeButton={false} className="h-8" render={<Link href={`${ROUTES.promotion.promotions}/${row.original.id}`} />}>
              <EyeIcon className="size-3.5" />
              Chi tiết
            </Button>
          </div>
        ),
      },
    ],
    [shopNames],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <FilterTabs tabs={TABS} value={filters.active} onChange={(v) => setFilter("active", v)} />
        <NativeSelect aria-label="Phạm vi mã" className="w-40" value={filters.scope} onChange={(e) => setFilter("scope", e.target.value)}>
          <option value="">Mọi phạm vi</option>
          <option value="platform">{PROMOTION_SCOPE_LABEL.platform} (mã sàn)</option>
          <option value="shop">Mã của gian hàng</option>
        </NativeSelect>
      </div>
      {isError ? <ApiErrorState error={error} fallback={LOAD_ERROR} compact /> : null}
      <DataTable
        columns={columns}
        data={data?.content ?? []}
        loading={isLoading}
        searchPlaceholder="Tìm mã / tên…"
        searchValue={search}
        onSearchChange={setSearch}
        toolbar={
          <PermissionGate permission={PERMISSIONS.promotionManage}>
            <Button nativeButton={false} render={<Link href={ROUTES.promotion.promotionNew} />}>
              <PlusIcon className="size-4" />
              Tạo mã
            </Button>
          </PermissionGate>
        }
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
