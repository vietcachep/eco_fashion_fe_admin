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
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { isForbiddenError } from "@/lib/api-error";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/format";
import { PROMO_TYPE_LABEL } from "@/lib/labels";
import { useListState } from "@/hooks/use-list-state";
import { useAdminPromotions } from "@/features/promotion/hooks/use-promotions";
import type { PromotionAdminResponse } from "@/features/promotion/types/promotion";

const TABS = [
  { key: "", label: "Tất cả" },
  { key: "active", label: "Đang bật" },
  { key: "inactive", label: "Đang tắt" },
] as const;

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được mã khuyến mãi.";
const DEFAULTS = { active: "" };

/* Hiển thị mức giảm gọn: "10% (tối đa 50.000 ₫)" / "50.000 ₫" / "Freeship". */
export function describeDiscount(p: PromotionAdminResponse): string {
  if (p.type === "free_shipping") return "Miễn phí vận chuyển";
  if (p.type === "percentage")
    return `${p.percentValue ?? ""}%${p.displayMaxDiscount ? ` (tối đa ${p.displayMaxDiscount.display})` : ""}`;
  return p.displayValue?.display ?? "";
}

export function PromotionsTable() {
  const { filters, setFilter, search, setSearch, keyword, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const { data, isLoading, isError, error } = useAdminPromotions({
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
          <div className="leading-tight">
            <Link href={`${ROUTES.promotion.promotions}/${row.original.id}`} className="font-mono text-sm font-semibold hover:underline">
              {row.original.code}
            </Link>
            <p className="text-xs text-muted-foreground">{row.original.name}</p>
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
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.startAt)} → {formatDate(row.original.endAt)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const p = row.original;
          const expired = new Date(p.endAt) < new Date();
          return (
            <div className="flex flex-wrap gap-1">
              {!p.isActive ? (
                <StatusBadge tone="neutral">Đang tắt</StatusBadge>
              ) : expired ? (
                <StatusBadge tone="warning">Hết hạn</StatusBadge>
              ) : (
                <StatusBadge tone="success">Đang chạy</StatusBadge>
              )}
              {!p.isPublic ? <Badge variant="outline">Ẩn (nhập tay)</Badge> : null}
            </div>
          );
        },
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
    [],
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
