"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { BanknoteIcon, ShoppingBagIcon, ShoppingCartIcon, UsersIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { StatCard } from "@/components/shared/stat-card";
import type { MoneyResponse } from "@/lib/api/generated/model";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDateTime, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePermission } from "@/hooks/use-permission";
import {
  shiftDay,
  useShopDashboard,
  useShopLowStock,
  useShopPrevMonthRevenue,
  useShopRevenue,
} from "@/features/reporting/hooks/use-shop-reports";
import { REVENUE_DEFINITION, type ShopChartPoint } from "@/features/reporting/types/shop-reporting";
import { ShopTopProductsCard } from "@/features/reporting/components/vendor/shop-top-products-card";
import { ShopLowStockCard } from "@/features/reporting/components/vendor/shop-low-stock-card";

/* Biểu đồ nặng (recharts) tải lười — số liệu hiện trước (Rule 1). */
const RevenueChart = dynamic(
  () => import("@/features/reporting/components/vendor/shop-revenue-chart").then((m) => m.ShopRevenueChart),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded-lg" /> },
);

const LOAD_ERROR = "Không tải được số liệu tổng quan của shop.";

const RANGE_TABS = [
  { key: "7", label: "7 ngày" },
  { key: "30", label: "30 ngày" },
] as const;

/* "↑ 12.5% so với hôm qua" — phần trăm là phép tính hiển thị trên số tiền backend đã chốt. */
function deltaHint(current: MoneyResponse | undefined, previous: MoneyResponse | undefined, label: string): React.ReactNode {
  if (!current || !previous) return "—";
  const cur = Number(current.amount);
  const prev = Number(previous.amount);
  if (prev === 0) return cur === 0 ? `Chưa có doanh thu ${label}` : `Mới phát sinh — ${label} chưa có`;
  const pct = ((cur - prev) / prev) * 100;
  if (Math.abs(pct) < 0.05) return `Bằng ${label}`;
  const up = pct > 0;
  return (
    <span className={up ? "text-emerald-600" : "text-red-600"}>
      {up ? "↑" : "↓"} {formatPercent(Math.abs(pct))} so với {label}
    </span>
  );
}

function PendingTile({
  label,
  hint,
  count,
  href,
  loading,
  highlight,
}: {
  label: string;
  hint: string;
  count?: number;
  /** Bỏ trống khi người dùng thiếu quyền vào màn đích — ô vẫn hiện số nhưng không phải link. */
  href?: string;
  loading: boolean;
  highlight?: boolean;
}) {
  const body = (
    <>
      <span className="text-xs text-muted-foreground">{label}</span>
      {loading ? (
        <Skeleton className="h-6 w-10 rounded" />
      ) : (
        <span className={cn("font-heading text-xl font-semibold", highlight && (count ?? 0) > 0 && "text-primary")}>{formatNumber(count ?? 0)}</span>
      )}
      <span className="truncate text-[11px] text-muted-foreground">{hint}</span>
    </>
  );
  const cls = "flex flex-col gap-1 bg-card px-4 py-3";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:bg-muted/60")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/*
 * Dashboard của shop (GET /shop/reports/dashboard — backend gom sẵn, cache 60s):
 * doanh thu hôm nay / tháng này kèm so kỳ trước, số đơn, khách mới, việc đang
 * chờ, biểu đồ 7 ngày (từ dashboard) hoặc 30 ngày (từ báo cáo doanh thu), top
 * sản phẩm tháng này, sản phẩm sắp hết hàng.
 */
export function VendorDashboard() {
  const [range, setRange] = useState<"7" | "30">("7");
  const canReadOrders = usePermission(PERMISSIONS.shopOrderRead);
  const canReadInventory = usePermission(PERMISSIONS.shopInventoryRead);

  const { data, isLoading, error } = useShopDashboard();
  const today = data?.today.day;
  const prevMonth = useShopPrevMonthRevenue(today);
  const revenue30 = useShopRevenue({ from: today ? shiftDay(today, -29) : "", to: today ?? "", granularity: "day" }, range === "30" && !!today);
  const lowStock = useShopLowStock({ limit: 6 });

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  const last7 = data?.last7Days ?? [];
  const yesterday = last7.length >= 2 ? last7[last7.length - 2].revenue : undefined;
  const chartPoints: ShopChartPoint[] | undefined =
    range === "7"
      ? data?.last7Days.map((p) => ({ period: p.day, revenue: p.revenue, orderCount: p.orderCount }))
      : revenue30.data?.points.map((p) => ({ period: p.period, revenue: p.revenue, orderCount: p.orderCount }));
  const chartLoading = range === "7" ? isLoading : revenue30.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Doanh thu hôm nay"
          value={data?.today.revenue.display ?? "—"}
          hint={data ? deltaHint(data.today.revenue, yesterday, "hôm qua") : undefined}
          icon={BanknoteIcon}
          tone="primary"
          loading={isLoading}
        />
        <StatCard
          label="Doanh thu tháng này"
          value={data?.month.revenue.display ?? "—"}
          hint={data ? deltaHint(data.month.revenue, prevMonth.data, "cùng kỳ tháng trước") : undefined}
          icon={ShoppingBagIcon}
          tone="success"
          loading={isLoading}
        />
        <StatCard
          label="Số đơn hôm nay"
          value={data ? formatNumber(data.today.orderCount) : "—"}
          hint={data ? `Tháng này ${formatNumber(data.month.orderCount)} đơn · ${formatNumber(data.month.paidCount)} tính doanh thu` : undefined}
          icon={ShoppingCartIcon}
          loading={isLoading}
        />
        <StatCard
          label="Khách mới (tháng)"
          value={data ? formatNumber(data.month.newCustomers) : "—"}
          hint={data ? `Hôm nay ${formatNumber(data.today.newCustomers)}` : undefined}
          icon={UsersIcon}
          loading={isLoading}
        />
      </div>

      <Card className="py-0">
        <CardContent className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border p-0 lg:grid-cols-4">
          <PendingTile
            label="Đơn chờ xác nhận"
            hint="COD hoặc đã thanh toán"
            count={data?.pending.awaitingConfirm}
            href={canReadOrders ? `${ROUTES.vendor.orders}?status=pending` : undefined}
            loading={isLoading}
            highlight
          />
          <PendingTile
            label="Cần đóng gói"
            hint="Đã xác nhận + đang đóng gói"
            count={data?.pending.packing}
            href={canReadOrders ? `${ROUTES.vendor.orders}?status=confirmed` : undefined}
            loading={isLoading}
          />
          <PendingTile
            label="Đang giao"
            hint="Chờ khách nhận hàng"
            count={data?.pending.shipping}
            href={canReadOrders ? `${ROUTES.vendor.orders}?status=shipping` : undefined}
            loading={isLoading}
          />
          <PendingTile
            label="Sắp hết hàng"
            hint="Khả dụng ≤ 5"
            count={data?.pending.lowStock}
            href={canReadInventory ? ROUTES.vendor.inventory : undefined}
            loading={isLoading}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Doanh thu {range} ngày gần nhất</CardTitle>
            <FilterTabs tabs={RANGE_TABS} value={range} onChange={(v) => setRange(v as "7" | "30")} />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {range === "30" && revenue30.error ? (
              <ApiErrorState error={revenue30.error} fallback="Không tải được doanh thu 30 ngày." compact />
            ) : chartLoading || !chartPoints ? (
              <Skeleton className="h-72 w-full rounded-lg" />
            ) : (
              <RevenueChart points={chartPoints} />
            )}
            <p className="text-xs text-muted-foreground">{REVENUE_DEFINITION}</p>
            {data ? <p className="text-xs text-muted-foreground">Cập nhật {formatDateTime(data.generatedAt)}</p> : null}
          </CardContent>
        </Card>

        <ShopTopProductsCard
          rows={data?.topProducts}
          loading={isLoading}
          title="Bán chạy tháng này"
          description="Số lượng và doanh thu ròng (đã trừ hàng trả)"
        />
      </div>

      <ShopLowStockCard
        rows={lowStock.data}
        total={data?.pending.lowStock}
        loading={lowStock.isPending}
        error={lowStock.error}
        linkToInventory={canReadInventory}
      />
    </div>
  );
}
