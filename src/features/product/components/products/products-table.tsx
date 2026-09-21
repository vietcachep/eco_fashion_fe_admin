"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { EyeIcon, ImageIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { NativeSelect } from "@/components/shared/native-select";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { isForbiddenError } from "@/lib/api-error";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { GENDER_LABEL, PRODUCT_STATUS, statusMeta } from "@/lib/labels";
import { useListState } from "@/hooks/use-list-state";
import { useAdminCategories } from "@/features/catalog/hooks/use-categories";
import { useAdminProducts } from "@/features/product/hooks/use-products";
import type { ProductListItem } from "@/features/product/types/product";

const STATUS_TABS = [
  { key: "", label: "Tất cả" },
  { key: "active", label: "Đang bán" },
  { key: "draft", label: "Nháp" },
  { key: "hidden", label: "Đã ẩn" },
] as const;

const PAGE_SIZE = 12;
const LOAD_ERROR = "Không tải được danh sách sản phẩm.";
const DEFAULTS = { status: "", category: "", gender: "" };

/*
 * Danh sách sản phẩm khu quản trị: lọc trạng thái / ngành / giới, tìm không
 * dấu, phân trang server (`pageSize`). Ngành hàng lấy từ hook của feature
 * catalog qua public API của nó (hooks/), không import internals.
 */
export function ProductsTable() {
  const { filters, setFilter, search, setSearch, keyword, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const { data: categories } = useAdminCategories();

  const { data, isLoading, isError, error } = useAdminProducts({
    keyword,
    status: filters.status,
    category: filters.category,
    gender: filters.gender,
    page,
    pageSize: PAGE_SIZE,
  });

  const columns: ColumnDef<ProductListItem>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Sản phẩm",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- ảnh động
                  <img src={p.imageUrl} alt="" className="size-full object-cover" />
                ) : (
                  <ImageIcon className="size-4 text-muted-foreground/60" />
                )}
              </div>
              <div className="min-w-0">
                <Link href={`${ROUTES.product.products}/${p.id}`} className="block truncate font-medium hover:underline">
                  {p.name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {p.categorySlug} · {GENDER_LABEL[p.gender] ?? p.gender} · {p.colors.length} màu · {p.sizes.join("/") || "—"}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: "price",
        header: "Giá",
        cell: ({ row }) => (
          <div className="leading-tight">
            <p className="font-medium">{row.original.price.display}</p>
            {row.original.listPrice ? (
              <p className="text-xs text-muted-foreground line-through">{row.original.listPrice.display}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: "stock",
        header: "Kho",
        cell: ({ row }) =>
          row.original.inStock ? (
            <StatusBadge tone="success">Còn hàng</StatusBadge>
          ) : (
            <StatusBadge tone="danger">Hết hàng</StatusBadge>
          ),
      },
      {
        id: "sold",
        header: "Đã bán",
        cell: ({ row }) => (
          <span className="text-sm">
            {formatNumber(row.original.soldCount)}
            <span className="text-muted-foreground"> · ★ {row.original.avgRating.toFixed(1)}</span>
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const m = statusMeta(PRODUCT_STATUS, row.original.status);
          return (
            <div className="flex flex-wrap items-center gap-1">
              <StatusBadge tone={m.tone}>{m.label}</StatusBadge>
              {row.original.badge ? <Badge variant="outline">{row.original.badge}</Badge> : null}
            </div>
          );
        },
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
              className="h-8 rounded-lg"
              render={<Link href={`${ROUTES.product.products}/${row.original.id}`} />}
            >
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <FilterTabs tabs={STATUS_TABS} value={filters.status} onChange={(v) => setFilter("status", v)} />
        <NativeSelect aria-label="Ngành hàng" className="w-44" value={filters.category} onChange={(e) => setFilter("category", e.target.value)}>
          <option value="">Mọi ngành hàng</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Giới" className="w-32" value={filters.gender} onChange={(e) => setFilter("gender", e.target.value)}>
          <option value="">Mọi giới</option>
          {Object.entries(GENDER_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </NativeSelect>
      </div>

      {isError ? <ApiErrorState error={error} fallback={LOAD_ERROR} compact /> : null}

      <DataTable
        columns={columns}
        data={data?.content ?? []}
        loading={isLoading}
        searchPlaceholder="Tìm tên sản phẩm (không dấu cũng được)…"
        searchValue={search}
        onSearchChange={setSearch}
        toolbar={
          <PermissionGate permission={PERMISSIONS.productCreate}>
            <Button nativeButton={false} render={<Link href={ROUTES.product.productNew} />}>
              <PlusIcon className="size-4" />
              Thêm sản phẩm
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
