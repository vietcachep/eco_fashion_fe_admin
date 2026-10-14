"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { EyeIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { DataTable } from "@/components/shared/data-table";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { PermissionGate } from "@/components/shared/permission-gate";
import { isForbiddenError } from "@/lib/api-error";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/format";
import { PROMO_TYPE_LABEL } from "@/lib/labels";
import { useListState } from "@/hooks/use-list-state";
import { usePermission } from "@/hooks/use-permission";
import { useShopPromotions, useToggleShopPromotion } from "@/features/promotion/hooks/use-shop-promotions";
import { describeDiscount, PromotionPhaseBadge } from "@/features/promotion/components/common/promotion-display";
import type { PromotionAdminResponse } from "@/features/promotion/types/promotion";

/*
 * Backend chỉ lọc mã của shop theo `active` (bật/tắt) + từ khoá — không có tham số
 * lọc "sắp diễn ra / hết hạn". Lọc những giai đoạn đó trên một trang là lọc giả
 * (sai tổng số, lệch phân trang) nên màn chỉ lọc bật/tắt ở server, còn giai đoạn
 * hiện thành badge ở từng dòng.
 */
const TABS = [
  { key: "", label: "Tất cả" },
  { key: "active", label: "Đang bật" },
  { key: "inactive", label: "Đã tắt" },
] as const;

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được mã giảm giá.";
const DEFAULTS = { active: "" };

const detailHref = (id: string) => `${ROUTES.vendor.promotions}/${id}`;

/* Công tắc bật/tắt nhanh; mỗi dòng tự giữ mutation của mình để chỉ công tắc đang đổi bị khoá. */
function ActiveSwitch({ promotion }: { promotion: PromotionAdminResponse }) {
  const toggle = useToggleShopPromotion();
  return (
    <Switch
      aria-label={promotion.isActive ? `Tắt mã ${promotion.code}` : `Bật mã ${promotion.code}`}
      checked={promotion.isActive}
      disabled={toggle.isPending}
      onCheckedChange={(v) => toggle.mutate({ id: promotion.id, isActive: v })}
    />
  );
}

/*
 * Mã giảm giá của gian hàng mình (GET /shop/promotions): lọc bật/tắt, tìm mã / tên,
 * phân trang server. Công tắc bật/tắt chỉ hiện với người có `shop.promotion.manage`.
 */
export function VendorPromotionsTable() {
  const { filters, setFilter, search, setSearch, keyword, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const canManage = usePermission(PERMISSIONS.shopPromotionManage);
  const { data, isLoading, isError, error } = useShopPromotions({
    keyword,
    active: filters.active === "active" ? true : filters.active === "inactive" ? false : undefined,
    page,
    size: PAGE_SIZE,
  });

  const columns: ColumnDef<PromotionAdminResponse>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: "Mã",
        cell: ({ row }) => (
          <div className="min-w-0 leading-tight">
            <Link href={detailHref(row.original.id)} className="font-mono text-sm font-semibold hover:underline">
              {row.original.code}
            </Link>
            <p className="max-w-56 truncate text-xs text-muted-foreground">{row.original.name}</p>
          </div>
        ),
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
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {formatDate(row.original.startAt)} → {formatDate(row.original.endAt)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Trạng thái",
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <PromotionPhaseBadge promotion={row.original} />
            {!row.original.isPublic ? <Badge variant="outline">Nhập tay</Badge> : null}
          </div>
        ),
      },
      ...(canManage
        ? [
            {
              id: "toggle",
              header: "Bật",
              cell: ({ row }) => <ActiveSwitch promotion={row.original} />,
            } satisfies ColumnDef<PromotionAdminResponse>,
          ]
        : []),
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="h-8" nativeButton={false} render={<Link href={detailHref(row.original.id)} />}>
              <EyeIcon className="size-3.5" />
              Chi tiết
            </Button>
          </div>
        ),
      },
    ],
    [canManage],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-3">
      <FilterTabs tabs={TABS} value={filters.active} onChange={(v) => setFilter("active", v)} />
      {isError ? <ApiErrorState error={error} fallback={LOAD_ERROR} compact /> : null}
      <DataTable
        columns={columns}
        data={data?.content ?? []}
        loading={isLoading}
        searchPlaceholder="Tìm mã / tên…"
        searchValue={search}
        onSearchChange={setSearch}
        toolbar={
          <PermissionGate permission={PERMISSIONS.shopPromotionManage}>
            <Button nativeButton={false} render={<Link href={ROUTES.vendor.promotionNew} />}>
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
