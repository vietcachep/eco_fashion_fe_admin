"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { StatusBadge } from "@/components/shared/status-badge";
import type { ShopLowStockResponse } from "@/lib/api/generated/model";
import { ROUTES } from "@/lib/constants";
import { formatNumber } from "@/lib/format";

/* Ngành thời trang "Đen / M"; ngành động backend đã ghép sẵn vào variantLabel ("128GB / Đen"). */
function variantOf(r: ShopLowStockResponse): string {
  return r.variantLabel || [r.colorName, r.sizeCode].filter(Boolean).join(" / ");
}

/*
 * Biến thể sắp hết hàng (khả dụng ≤ ngưỡng backend, mặc định 5) — dẫn tới màn
 * kho để nhập thêm. `total` là số biến thể sắp hết do dashboard đếm (danh sách
 * ở đây chỉ lấy vài dòng đầu).
 */
export function ShopLowStockCard({
  rows,
  total,
  loading,
  error,
  linkToInventory,
  className,
}: {
  rows?: ShopLowStockResponse[];
  total?: number;
  loading: boolean;
  error?: unknown;
  /** Chỉ hiện nút sang màn kho khi người dùng có quyền đọc kho. */
  linkToInventory: boolean;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base">Sản phẩm sắp hết hàng</CardTitle>
          <p className="pt-0.5 text-xs text-muted-foreground">
            {total === undefined ? "Số lượng khả dụng thấp" : `${formatNumber(total)} biến thể có số lượng khả dụng ≤ 5`}
          </p>
        </div>
        {linkToInventory ? (
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={ROUTES.vendor.inventory} />}>
            Quản lý kho
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {error ? (
          <ApiErrorState error={error} fallback="Không tải được danh sách sắp hết hàng." compact />
        ) : loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 flex-1 rounded" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : rows?.length ? (
          <ul className="flex flex-col divide-y">
            {rows.map((r) => (
              <li key={r.variantId} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <div className="min-w-0 text-sm leading-snug">
                  <p className="truncate font-medium">{r.productName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {variantOf(r) ? `${variantOf(r)} · ` : ""}
                    <code className="font-mono">{r.sku}</code>
                  </p>
                </div>
                <StatusBadge tone={r.available <= 0 ? "danger" : "warning"}>
                  {r.available <= 0 ? "Hết hàng" : `Còn ${formatNumber(r.available)}`}
                </StatusBadge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Không có biến thể nào sắp hết hàng.</p>
        )}
      </CardContent>
    </Card>
  );
}
