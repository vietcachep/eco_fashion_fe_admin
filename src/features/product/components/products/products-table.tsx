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
import { StatusBadge } from "@/components/shared/status-badge";
import { isForbiddenError } from "@/lib/api-error";
import { formatNumber } from "@/lib/format";
import { GENDER_LABEL, PRODUCT_STATUS, statusMeta } from "@/lib/labels";
import { useListState } from "@/hooks/use-list-state";
import { useProductCategories } from "@/features/product/hooks/use-product-catalog";
import { useProductScope } from "@/features/product/hooks/use-product-scope";
import { useProducts } from "@/features/product/hooks/use-products";
import type { ProductCategoryOption, ProductListItem, ProductScope } from "@/features/product/types/product";

const STATUS_TABS = [
  { key: "", label: "Tất cả" },
  { key: "active", label: "Đang bán" },
  { key: "draft", label: "Nháp" },
  { key: "hidden", label: "Đã ẩn" },
] as const;

const PAGE_SIZE = 12;
const LOAD_ERROR = "Không tải được danh sách sản phẩm.";
const DEFAULTS = { status: "", category: "" };

/*
 * Danh sách sản phẩm DÙNG CHUNG hai cổng (`scope`): sàn thấy mọi shop, vendor chỉ
 * thấy hàng của shop mình (backend lọc theo shop trong JWT). Lọc trạng thái / ngành
 * lá, tìm không dấu, phân trang server (`page`/`pageSize`).
 *
 * Danh sách chỉ trả thẻ sản phẩm (không có tổng tồn / số biến thể) nên cột kho chỉ
 * phản ánh còn / hết hàng; số lượng cụ thể xem ở chi tiết hoặc màn Kho. Ngành lá
 * lấy từ hook catalog của chính feature product để hiện tên + phân biệt kiểu ngành
 * (giới tính / màu / size chỉ có nghĩa với ngành thời trang).
 */
export function ProductsTable({ scope }: { scope: ProductScope }) {
  const { can, newHref, detailHref } = useProductScope(scope);
  const { filters, setFilter, search, setSearch, keyword, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const categories = useProductCategories(scope);

  const { data, isLoading, isError, error } = useProducts(scope, {
    keyword,
    status: filters.status,
    category: filters.category,
    page,
    pageSize: PAGE_SIZE,
  });

  const bySlug = useMemo(
    () => new Map<string, ProductCategoryOption>((categories.data ?? []).map((c) => [c.slug, c])),
    [categories.data],
  );

  const columns: ColumnDef<ProductListItem>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Sản phẩm",
        cell: ({ row }) => {
          const p = row.original;
          const category = bySlug.get(p.categorySlug);
          const fashion = category?.attributeMode === "legacy_fashion";
          const variantInfo = [
            fashion ? (GENDER_LABEL[p.gender] ?? null) : null,
            p.colors.length > 0 ? `${p.colors.length} màu` : null,
            p.sizes.length > 0 ? p.sizes.join("/") : null,
          ].filter(Boolean);
          return (
            <div className="flex min-w-52 items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- ảnh Cloudinary động
                  <img src={p.imageUrl} alt="" className="size-full object-cover" />
                ) : (
                  <ImageIcon className="size-4 text-muted-foreground/60" />
                )}
              </div>
              <div className="min-w-0">
                <Link href={detailHref(p.id)} className="block truncate font-medium hover:underline">
                  {p.name}
                </Link>
                {variantInfo.length > 0 ? <p className="truncate text-xs text-muted-foreground">{variantInfo.join(" · ")}</p> : null}
              </div>
            </div>
          );
        },
      },
      {
        id: "category",
        header: "Ngành hàng",
        cell: ({ row }) => {
          const category = bySlug.get(row.original.categorySlug);
          return (
            <span className="text-sm" title={category?.path}>
              {category?.name ?? row.original.categorySlug}
            </span>
          );
        },
      },
      {
        id: "price",
        header: "Giá",
        cell: ({ row }) => (
          <div className="leading-tight whitespace-nowrap">
            <p className="font-medium">{row.original.price.display}</p>
            {row.original.listPrice ? <p className="text-xs text-muted-foreground line-through">{row.original.listPrice.display}</p> : null}
          </div>
        ),
      },
      {
        id: "stock",
        header: "Kho",
        cell: ({ row }) =>
          row.original.inStock ? <StatusBadge tone="success">Còn hàng</StatusBadge> : <StatusBadge tone="danger">Hết hàng</StatusBadge>,
      },
      {
        id: "sold",
        header: "Đã bán",
        cell: ({ row }) => (
          <span className="text-sm whitespace-nowrap">
            {formatNumber(row.original.soldCount)}
            {row.original.reviewCount > 0 ? <span className="text-muted-foreground"> · ★ {row.original.avgRating.toFixed(1)}</span> : null}
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
            <Button variant="outline" size="sm" nativeButton={false} className="h-8 rounded-lg" render={<Link href={detailHref(row.original.id)} />}>
              <EyeIcon className="size-3.5" />
              Chi tiết
            </Button>
          </div>
        ),
      },
    ],
    [bySlug, detailHref],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <FilterTabs tabs={STATUS_TABS} value={filters.status} onChange={(v) => setFilter("status", v)} />
        <NativeSelect
          aria-label="Ngành hàng"
          className="w-60"
          value={filters.category}
          onChange={(e) => setFilter("category", e.target.value)}
        >
          <option value="">Mọi ngành hàng</option>
          {(categories.data ?? []).map((c) => (
            <option key={c.id} value={c.slug}>
              {c.path}
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
          can.create ? (
            <Button nativeButton={false} render={<Link href={newHref} />}>
              <PlusIcon className="size-4" />
              Thêm sản phẩm
            </Button>
          ) : null
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
