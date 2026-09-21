"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2Icon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { StatCard } from "@/components/shared/stat-card";
import { formatNumber, toDayString } from "@/lib/format";
import { useRecomputeReports, useRevenueReport } from "@/features/reporting/hooks/use-reports";
import { DateRangePicker, defaultRange, type DateRange } from "@/features/reporting/components/shared/date-range-picker";

const RevenueChart = dynamic(
  () => import("@/features/reporting/components/revenue/revenue-chart").then((m) => m.RevenueChart),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded-lg" /> },
);

const GRANULARITY = [
  { key: "day", label: "Theo ngày" },
  { key: "month", label: "Theo tháng" },
] as const;

const LOAD_ERROR = "Không tải được báo cáo doanh thu.";

/*
 * Doanh thu theo kỳ (từ bảng daily_sales worker tính sẵn): chọn khoảng ngày +
 * độ mịn, biểu đồ + bảng + tổng. Nút "Tính lại" chạy lại daily_sales cho khoảng
 * đang xem khi nghi số lệch (tối đa 400 ngày).
 */
export function RevenueScreen() {
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [granularity, setGranularity] = useState<"day" | "month">("day");
  const [recomputeRange, setRecomputeRange] = useState<DateRange>({ from: toDayString(new Date()), to: toDayString(new Date()) });
  const { data, isPending, error, isFetching } = useRevenueReport({ ...range, granularity });
  const recompute = useRecomputeReports();

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  const t = data?.total;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <DateRangePicker value={range} onChange={setRange} />
        <FilterTabs tabs={GRANULARITY} value={granularity} onChange={(v) => setGranularity(v as "day" | "month")} />
        {isFetching ? <Loader2Icon className="size-4 animate-spin text-muted-foreground" /> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Doanh thu" value={t?.revenue.display ?? "—"} tone="primary" loading={isPending} />
        <StatCard label="Đơn hàng" value={formatNumber(t?.orderCount)} hint={t ? `${formatNumber(t.paidCount)} đã thanh toán · ${formatNumber(t.cancelledCount)} huỷ` : undefined} loading={isPending} />
        <StatCard label="Sản phẩm bán ra" value={formatNumber(t?.itemsSold)} loading={isPending} />
        <StatCard label="Giảm giá / hoàn tiền" value={t?.discount.display ?? "—"} hint={t ? `Hoàn ${t.refunded.display}` : undefined} loading={isPending} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Biểu đồ</CardTitle>
        </CardHeader>
        <CardContent>{isPending || !data ? <Skeleton className="h-72 w-full rounded-lg" /> : <RevenueChart points={data.points} />}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chi tiết theo kỳ</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Kỳ</TableHead>
                  <TableHead className="text-right">Doanh thu</TableHead>
                  <TableHead className="text-right">Đơn</TableHead>
                  <TableHead className="text-right">Đã TT</TableHead>
                  <TableHead className="text-right">Huỷ</TableHead>
                  <TableHead className="text-right">SP bán</TableHead>
                  <TableHead className="text-right">Giảm giá</TableHead>
                  <TableHead className="text-right">Hoàn</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPending ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data?.points.length ? (
                  data.points.map((p) => (
                    <TableRow key={p.period}>
                      <TableCell className="font-medium">{p.period}</TableCell>
                      <TableCell className="text-right">{p.revenue.display}</TableCell>
                      <TableCell className="text-right">{formatNumber(p.orderCount)}</TableCell>
                      <TableCell className="text-right">{formatNumber(p.paidCount)}</TableCell>
                      <TableCell className="text-right">{formatNumber(p.cancelledCount)}</TableCell>
                      <TableCell className="text-right">{formatNumber(p.itemsSold)}</TableCell>
                      <TableCell className="text-right">{p.discount.display}</TableCell>
                      <TableCell className="text-right">{p.refunded.display}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-20 text-center text-sm text-muted-foreground">
                      Không có số liệu trong khoảng này.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="text-sm">
            <p className="font-medium">Tính lại số liệu</p>
            <p className="text-xs text-muted-foreground">Chạy lại daily_sales cho khoảng ngày (tối đa 400 ngày) khi nghi số bị lệch.</p>
          </div>
          <Input type="date" className="w-40" value={recomputeRange.from} onChange={(e) => setRecomputeRange((r) => ({ ...r, from: e.target.value }))} />
          <Input type="date" className="w-40" value={recomputeRange.to} onChange={(e) => setRecomputeRange((r) => ({ ...r, to: e.target.value }))} />
          <Button variant="outline" disabled={recompute.isPending} onClick={() => recompute.mutate(recomputeRange)}>
            {recompute.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
            Tính lại
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
