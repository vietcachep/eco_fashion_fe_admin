"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  AlertTriangleIcon,
  BanknoteIcon,
  PackageIcon,
  ShoppingBagIcon,
  UsersIcon,
} from "lucide-react";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/constants";
import { formatDateTime, formatNumber } from "@/lib/format";
import { useDashboard } from "@/features/reporting/hooks/use-reports";
import { PendingTasksCard } from "@/features/reporting/components/dashboard/pending-tasks-card";
import { TopProductsCard } from "@/features/reporting/components/dashboard/top-products-card";
import { OrderStatusCard } from "@/features/reporting/components/dashboard/order-status-card";

/* Biểu đồ nặng (recharts) tải lười — dashboard hiện số liệu trước (Rule 1). */
const Last7DaysChart = dynamic(
  () => import("@/features/reporting/components/dashboard/last-7-days-chart").then((m) => m.Last7DaysChart),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-lg" /> },
);

const LOAD_ERROR = "Không tải được số liệu tổng quan.";

/*
 * Dashboard điều hành: hôm nay / tháng này, việc đang chờ, 7 ngày gần nhất,
 * top sản phẩm, trạng thái đơn, phương thức thanh toán — tất cả từ MỘT lời
 * gọi GET /admin/reports/dashboard (backend gom sẵn, cache Redis).
 */
export function DashboardScreen() {
  const { data, isLoading, error } = useDashboard();

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  const today = data?.today;
  const month = data?.month;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Doanh thu hôm nay"
          value={today?.revenue.display ?? "—"}
          hint={today ? `${formatNumber(today.orderCount)} đơn · ${formatNumber(today.paidCount)} đã thanh toán` : undefined}
          icon={BanknoteIcon}
          tone="primary"
          loading={isLoading}
        />
        <StatCard
          label="Doanh thu tháng này"
          value={month?.revenue.display ?? "—"}
          hint={month ? `${formatNumber(month.orderCount)} đơn · hoàn ${month.refunded.display}` : undefined}
          icon={ShoppingBagIcon}
          tone="success"
          loading={isLoading}
        />
        <StatCard
          label="Sản phẩm bán ra (tháng)"
          value={month ? formatNumber(month.itemsSold) : "—"}
          hint={today ? `Hôm nay ${formatNumber(today.itemsSold)}` : undefined}
          icon={PackageIcon}
          loading={isLoading}
        />
        <StatCard
          label="Khách mới (tháng)"
          value={month ? formatNumber(month.newCustomers) : "—"}
          hint={today ? `Hôm nay ${formatNumber(today.newCustomers)}` : undefined}
          icon={UsersIcon}
          loading={isLoading}
        />
      </div>

      <PendingTasksCard pending={data?.pending} loading={isLoading} />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Doanh thu 7 ngày gần nhất</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <Skeleton className="h-64 w-full rounded-lg" />
            ) : (
              <Last7DaysChart points={data.last7Days} />
            )}
          </CardContent>
        </Card>
        <OrderStatusCard
          orderStatus={data?.orderStatus}
          paymentMethods={data?.paymentMethods}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <TopProductsCard rows={data?.topProducts} loading={isLoading} className="xl:col-span-2" />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangleIcon className="size-4 text-amber-600" />
              Cần chú ý
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {isLoading ? (
              <>
                <Skeleton className="h-5 w-full rounded" />
                <Skeleton className="h-5 w-3/4 rounded" />
              </>
            ) : (
              <>
                <Link href={ROUTES.product.stock} className="flex justify-between hover:underline">
                  <span>Biến thể sắp hết hàng</span>
                  <span className="font-semibold">{formatNumber(data?.pending.lowStock)}</span>
                </Link>
                <Link href={ROUTES.system.contacts} className="flex justify-between hover:underline">
                  <span>Liên hệ mới chưa trả lời</span>
                  <span className="font-semibold">{formatNumber(data?.pending.contactsNew)}</span>
                </Link>
                <Link href={ROUTES.ai.support} className="flex justify-between hover:underline">
                  <span>Yêu cầu hỗ trợ từ chatbot</span>
                  <span className="font-semibold">{formatNumber(data?.pending.supportOpen)}</span>
                </Link>
                <p className="pt-2 text-xs text-muted-foreground">
                  Cập nhật {formatDateTime(data?.generatedAt)}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
