"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, EyeIcon, EyeOffIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { apiMessage } from "@/lib/api-error";
import { formatNumber } from "@/lib/format";
import { PRODUCT_STATUS, statusMeta } from "@/lib/labels";
import { useProductScope } from "@/features/product/hooks/use-product-scope";
import { resolveProductCategory, useProductCategories } from "@/features/product/hooks/use-product-catalog";
import { useHideProduct, usePublishProduct, useProduct, useRemoveProduct } from "@/features/product/hooks/use-products";
import type { ProductScope } from "@/features/product/types/product";
import { ProductForm } from "@/features/product/components/products/product-form";
import { ProductImagesPanel } from "@/features/product/components/products/product-images-panel";
import { ProductNotice } from "@/features/product/components/products/product-notice";
import { ProductPrecheckCard } from "@/features/product/components/products/product-precheck-card";
import { ProductVariantsEditor } from "@/features/product/components/products/product-variants-editor";

const LOAD_ERROR = "Không tải được sản phẩm.";
const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL || "";

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

/*
 * Màn chi tiết sản phẩm DÙNG CHUNG hai cổng (`scope`): header (trạng thái, đăng
 * bán / ẩn / xoá) + 3 tab Thông tin · Biến thể · Ảnh. Đăng bán cần đủ biến thể,
 * ảnh và thuộc tính bắt buộc của ngành — backend kiểm và báo chính xác thiếu gì,
 * nên lý do được giữ lại trên màn (không chỉ toast) để người bán sửa theo.
 */
export function ProductDetailScreen({ scope, id }: { scope: ProductScope; id: string }) {
  const router = useRouter();
  const { can, isVendor, listHref } = useProductScope(scope);
  const { data: product, isPending, error } = useProduct(scope, id);
  const categories = useProductCategories(scope);
  const publish = usePublishProduct(scope, id);
  const hide = useHideProduct(scope, id);
  const remove = useRemoveProduct(scope);
  const [tab, setTab] = useState<string>("info");
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Xoá xong: danh sách/chi tiết đang được làm mới nên chi tiết sẽ 404 một nhịp — giữ skeleton tới khi chuyển trang.
  if (remove.isSuccess) return <DetailSkeleton />;
  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;
  if (isPending || !product) return <DetailSkeleton />;

  const status = statusMeta(PRODUCT_STATUS, product.status);
  const available = product.totalStock - product.totalReserved;
  const category = resolveProductCategory(categories.data, product.categoryId, product);
  const tabs = [
    { key: "info", label: "Thông tin" },
    { key: "variants", label: category?.attributeMode === "legacy_fashion" ? "Biến thể (màu × size)" : "Biến thể" },
    { key: "images", label: "Ảnh" },
  ];
  const isActive = product.status === "active";
  // Gợi ý sớm hai điều kiện đăng bán mà FE tự biết; thuộc tính bắt buộc của ngành do backend báo khi bấm đăng bán.
  const gaps = [product.variants.length === 0 ? "biến thể" : null, product.images.length === 0 ? "ảnh" : null].filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={product.name}
        description={`/${product.slug} · ${product.variants.length} biến thể · tồn ${formatNumber(product.totalStock)} (khả dụng ${formatNumber(available)}) · đã bán ${formatNumber(product.soldCount)}`}
      >
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        <Button variant="outline" nativeButton={false} render={<Link href={listHref} />}>
          <ArrowLeftIcon className="size-4" />
          Danh sách
        </Button>
        {STOREFRONT_URL && isActive ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={`${STOREFRONT_URL}/product/${product.slug}`} target="_blank" rel="noreferrer" />}
          >
            Xem trên web
          </Button>
        ) : null}
        {can.publish ? (
          isActive ? (
            <Button variant="outline" onClick={() => hide.mutate()} disabled={hide.isPending}>
              {hide.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <EyeOffIcon className="size-4" />}
              Ẩn
            </Button>
          ) : (
            <Button onClick={() => publish.mutate()} disabled={publish.isPending}>
              {publish.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <EyeIcon className="size-4" />}
              Đăng bán
            </Button>
          )
        ) : null}
        {can.remove ? (
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2Icon className="size-4" />
            Xoá
          </Button>
        ) : null}
      </PageHeader>

      {publish.isError ? (
        <ProductNotice tone="danger">{apiMessage(publish.error) ?? "Đăng bán thất bại."}</ProductNotice>
      ) : null}
      {!isActive && can.publish && gaps.length > 0 ? (
        <ProductNotice tone="info">Cần thêm {gaps.join(" và ")} (và đủ thuộc tính bắt buộc của ngành) trước khi đăng bán.</ProductNotice>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <FilterTabs tabs={tabs} value={tab} onChange={setTab} />
        {!isVendor
          ? product.tags.map((t) => (
              <Badge key={t} variant="outline">
                #{t}
              </Badge>
            ))
          : null}
      </div>

      {tab === "info" ? (
        <div className="flex flex-col gap-4">
          {!isVendor ? <ProductPrecheckCard productId={product.id} /> : null}
          <ProductForm key={product.updatedAt} scope={scope} product={product} />
        </div>
      ) : null}
      {tab === "variants" ? <ProductVariantsEditor scope={scope} product={product} /> : null}
      {tab === "images" ? <ProductImagesPanel scope={scope} product={product} /> : null}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Xoá sản phẩm "${product.name}"?`}
        description="Xoá mềm: sản phẩm biến mất khỏi web và danh sách; đơn cũ vẫn giữ snapshot."
        confirmLabel="Xoá"
        destructive
        onConfirm={() => remove.mutate(product.id, { onSuccess: () => router.replace(listHref) })}
      />
    </div>
  );
}
