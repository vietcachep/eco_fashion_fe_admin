"use client";

import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import type { ShopTopProductResponse } from "@/lib/api/generated/model";
import { ROUTES } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
 * Top sản phẩm bán chạy của shop (dashboard + báo cáo dùng chung). Số liệu là
 * RÒNG (đã trừ hàng khách trả, giảm giá của shop) — backend tính, FE chỉ hiện.
 * Link sang sản phẩm của shop (route vendor), khác thẻ cùng tên của khu sàn.
 */
export function ShopTopProductsCard({
  rows,
  loading,
  error,
  title = "Sản phẩm bán chạy",
  description,
  className,
}: {
  rows?: ShopTopProductResponse[];
  loading: boolean;
  error?: unknown;
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent>
        {error ? (
          <ApiErrorState error={error} fallback="Không tải được top sản phẩm." compact />
        ) : loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-md" />
                <Skeleton className="h-4 flex-1 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            ))}
          </div>
        ) : rows?.length ? (
          <ol className="flex flex-col divide-y">
            {rows.map((r, i) => (
              <li key={r.productId} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <span className={cn("w-5 text-center text-xs font-semibold", i < 3 ? "text-primary" : "text-muted-foreground")}>{i + 1}</span>
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
                  {r.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- ảnh động
                    <img src={r.imageUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <ImageIcon className="size-4 text-muted-foreground/60" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`${ROUTES.vendor.products}/${r.productId}`} className="block truncate text-sm font-medium hover:underline">
                    {r.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(r.quantity)} sp · {formatNumber(r.orderCount)} đơn
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold">{r.revenue.display}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có dữ liệu bán hàng trong kỳ.</p>
        )}
      </CardContent>
    </Card>
  );
}
