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
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { PRODUCT_STATUS, statusMeta } from "@/lib/labels";
import {
  useAdminProduct,
  useHideProduct,
  usePublishProduct,
  useRemoveProduct,
} from "@/features/product/hooks/use-products";
import { ProductForm } from "@/features/product/components/products/product-form";
import { ProductVariantsEditor } from "@/features/product/components/products/product-variants-editor";
import { ProductImagesPanel } from "@/features/product/components/products/product-images-panel";
import { ProductPrecheckCard } from "@/features/product/components/products/product-precheck-card";

const TABS = [
  { key: "info", label: "Thông tin" },
  { key: "variants", label: "Biến thể (màu × size)" },
  { key: "images", label: "Ảnh" },
] as const;

const LOAD_ERROR = "Không tải được sản phẩm.";
const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL || "";

/*
 * Màn chi tiết sản phẩm: header (trạng thái, đăng bán / ẩn / xoá) + 3 tab.
 * Đăng bán cần đủ biến thể + ảnh; backend kiểm và báo thiếu gì.
 */
export function ProductDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const { data: product, isPending, error } = useAdminProduct(id);
  const publish = usePublishProduct(id);
  const hide = useHideProduct(id);
  const remove = useRemoveProduct();
  const [tab, setTab] = useState<string>("info");
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;
  if (isPending || !product) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const status = statusMeta(PRODUCT_STATUS, product.status);
  const available = product.totalStock - product.totalReserved;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={product.name}
        description={`/${product.slug} · ${product.variants.length} biến thể · tồn ${formatNumber(product.totalStock)} (khả dụng ${formatNumber(available)}) · đã bán ${formatNumber(product.soldCount)}`}
      >
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        <Button variant="outline" nativeButton={false} render={<Link href={ROUTES.product.products} />}>
          <ArrowLeftIcon className="size-4" />
          Danh sách
        </Button>
        {STOREFRONT_URL && product.status === "active" ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={`${STOREFRONT_URL}/product/${product.slug}`} target="_blank" rel="noreferrer" />}
          >
            Xem trên web
          </Button>
        ) : null}
        <PermissionGate permission={PERMISSIONS.productPublish}>
          {product.status === "active" ? (
            <Button variant="outline" onClick={() => hide.mutate()} disabled={hide.isPending}>
              {hide.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <EyeOffIcon className="size-4" />}
              Ẩn
            </Button>
          ) : (
            <Button onClick={() => publish.mutate()} disabled={publish.isPending}>
              {publish.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <EyeIcon className="size-4" />}
              Đăng bán
            </Button>
          )}
        </PermissionGate>
        <PermissionGate permission={PERMISSIONS.productDelete}>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2Icon className="size-4" />
            Xoá
          </Button>
        </PermissionGate>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <FilterTabs tabs={TABS} value={tab} onChange={setTab} />
        {product.tags.map((t) => (
          <Badge key={t} variant="outline">
            #{t}
          </Badge>
        ))}
      </div>

      {tab === "info" ? (
        <div className="flex flex-col gap-4">
          <ProductPrecheckCard productId={product.id} />
          <ProductForm key={product.updatedAt} product={product} />
        </div>
      ) : null}
      {tab === "variants" ? <ProductVariantsEditor product={product} /> : null}
      {tab === "images" ? <ProductImagesPanel product={product} /> : null}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Xoá sản phẩm "${product.name}"?`}
        description="Xoá mềm: sản phẩm biến mất khỏi web và danh sách; đơn cũ vẫn giữ snapshot."
        confirmLabel="Xoá"
        destructive
        onConfirm={() => remove.mutate(product.id, { onSuccess: () => router.replace(ROUTES.product.products) })}
      />
    </div>
  );
}
