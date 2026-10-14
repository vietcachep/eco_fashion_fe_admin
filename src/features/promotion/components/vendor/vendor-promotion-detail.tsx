"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeftIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { DetailList } from "@/components/shared/detail-list";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDateTime, formatNumber } from "@/lib/format";
import { APPLIES_TO_LABEL, PROMO_TYPE_LABEL } from "@/lib/labels";
import {
  useRemoveShopPromotion,
  useShopCategoryLeaves,
  useShopProductNames,
  useShopPromotion,
  useShopPromotionUsages,
} from "@/features/promotion/hooks/use-shop-promotions";
import { describeDiscount, PromotionPhaseBadge } from "@/features/promotion/components/common/promotion-display";
import { VendorPromotionForm } from "@/features/promotion/components/vendor/vendor-promotion-form";
import type { PromotionUsageRow } from "@/features/promotion/types/promotion";

const LOAD_ERROR = "Không tải được mã giảm giá.";
const PAGE_SIZE = 10;

/*
 * Chi tiết một mã giảm giá của shop: thông tin + lượt dùng theo đơn (khách ẩn danh).
 * "Sửa" mở form tại chỗ; "Xoá" (xoá mềm) chỉ cho mã CHƯA có lượt dùng — mã đã dùng
 * thì tắt đi thay vì xoá, để lịch sử đơn vẫn đối chiếu được.
 */
export function VendorPromotionDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data: p, isPending, error } = useShopPromotion(id);
  const remove = useRemoveShopPromotion();
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const usages = useShopPromotionUsages(id, { page: pageIndex + 1, size: PAGE_SIZE });
  const leaves = useShopCategoryLeaves();
  const productIds = useMemo(() => p?.targets.filter((t) => t.targetType === "product").map((t) => t.targetRef) ?? [], [p]);
  const productNames = useShopProductNames(productIds);

  const columns: ColumnDef<PromotionUsageRow>[] = useMemo(
    () => [
      {
        accessorKey: "orderCode",
        header: "Đơn hàng",
        cell: ({ row }) => (
          <Link href={`${ROUTES.vendor.orders}/${row.original.orderCode}`} className="font-mono text-sm font-semibold hover:underline">
            {row.original.orderCode}
          </Link>
        ),
      },
      { id: "discount", header: "Đã giảm", cell: ({ row }) => row.original.discountAmount.display },
      { accessorKey: "createdAt", header: "Dùng lúc", cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.createdAt)}</span> },
      {
        id: "released",
        header: "Trạng thái",
        cell: ({ row }) =>
          row.original.releasedAt ? <StatusBadge tone="neutral">Đã nhả (đơn huỷ)</StatusBadge> : <StatusBadge tone="success">Có hiệu lực</StatusBadge>,
      },
    ],
    [],
  );

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;
  if (isPending || !p) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title={`Sửa mã ${p.code}`} description="Mã không đổi được sau khi tạo" />
        <VendorPromotionForm promotion={p} onCancel={() => setEditing(false)} />
      </div>
    );
  }

  const labelOfTarget = (t: { targetType: string; targetRef: string }) =>
    t.targetType === "category"
      ? (leaves.data?.find((l) => l.slug === t.targetRef)?.path ?? t.targetRef)
      : (productNames.get(t.targetRef) ?? `Sản phẩm …${t.targetRef.slice(-6)}`);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={p.code} description={p.name ?? undefined}>
        <PromotionPhaseBadge promotion={p} />
        <Button variant="outline" nativeButton={false} render={<Link href={ROUTES.vendor.promotions} />}>
          <ArrowLeftIcon className="size-4" />
          Danh sách
        </Button>
        <PermissionGate permission={PERMISSIONS.shopPromotionManage}>
          <Button variant="outline" onClick={() => setEditing(true)}>
            <PencilIcon className="size-4" />
            Sửa
          </Button>
          {p.usedCount === 0 ? (
            <Button variant="destructive" onClick={() => setDeleteOpen(true)} disabled={remove.isPending}>
              <Trash2Icon className="size-4" />
              Xoá
            </Button>
          ) : null}
        </PermissionGate>
      </PageHeader>

      {p.usedCount > 0 ? (
        <PermissionGate permission={PERMISSIONS.shopPromotionManage}>
          <p className="text-xs text-muted-foreground">Mã đã có lượt dùng nên không xoá được — hãy tắt mã (nút Sửa → bỏ “Đang bật”) nếu muốn ngừng áp dụng.</p>
        </PermissionGate>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông tin</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList
              rows={[
                { label: "Loại", value: PROMO_TYPE_LABEL[p.type] ?? p.type },
                { label: "Mức giảm", value: describeDiscount(p) },
                { label: "Đơn tối thiểu", value: p.displayMinOrderAmount?.display ?? "Không" },
                { label: "Lượt dùng", value: `${formatNumber(p.usedCount)}${p.usageLimit ? ` / ${formatNumber(p.usageLimit)}` : ""}` },
                { label: "Lượt / khách", value: p.usageLimitPerUser ?? "Không giới hạn" },
                {
                  label: "Phạm vi",
                  value: (
                    <span>
                      {p.appliesTo === "all" ? "Toàn bộ sản phẩm của shop" : (APPLIES_TO_LABEL[p.appliesTo] ?? p.appliesTo)}
                      {p.targets.length ? (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {p.targets.map((t) => (
                            <Badge key={`${t.targetType}:${t.targetRef}`} variant="secondary" className="max-w-full text-[11px]">
                              <span className="truncate">{labelOfTarget(t)}</span>
                            </Badge>
                          ))}
                        </span>
                      ) : null}
                    </span>
                  ),
                },
                { label: "Hiệu lực", value: `${formatDateTime(p.startAt)} → ${formatDateTime(p.endAt)}` },
                { label: "Hiển thị", value: p.isPublic ? "Gợi ý ở giỏ hàng" : "Ẩn — khách nhập tay" },
                { label: "Mô tả", value: p.description || "—" },
              ]}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Lượt dùng theo đơn</CardTitle>
          </CardHeader>
          <CardContent>
            {usages.error ? <ApiErrorState error={usages.error} fallback="Không tải được lượt dùng." compact /> : null}
            <DataTable
              columns={columns}
              data={usages.data?.content ?? []}
              loading={usages.isLoading}
              serverPagination={{
                pageIndex,
                pageSize: PAGE_SIZE,
                pageCount: usages.data?.totalPages || 1,
                total: usages.data?.totalElements ?? 0,
                onPageChange: setPageIndex,
              }}
            />
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Xoá mã ${p.code}?`}
        description="Mã biến mất khỏi web và không dùng được nữa. Thao tác này không hoàn tác từ giao diện — nếu chỉ muốn tạm ngừng, hãy tắt mã."
        confirmLabel="Xoá"
        destructive
        onConfirm={() => remove.mutate(p.id, { onSuccess: () => router.replace(ROUTES.vendor.promotions) })}
      />
    </div>
  );
}
