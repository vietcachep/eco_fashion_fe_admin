"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { DownloadIcon, InfoIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { StatCard } from "@/components/shared/stat-card";
import type { ShopRevenueResponse } from "@/lib/api/generated/model";
import { isForbiddenError } from "@/lib/api-error";
import { formatNumber } from "@/lib/format";
import { useShopRevenue, useShopTopProducts } from "@/features/reporting/hooks/use-shop-reports";
import { REVENUE_DEFINITION, type ShopChartPoint } from "@/features/reporting/types/shop-reporting";
import { DateRangePicker, defaultRange, type DateRange } from "@/features/reporting/components/shared/date-range-picker";
import { ShopTopProductsCard } from "@/features/reporting/components/vendor/shop-top-products-card";

const RevenueChart = dynamic(
  () => import("@/features/reporting/components/vendor/shop-revenue-chart").then((m) => m.ShopRevenueChart),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded-lg" /> },
);

const GRANULARITY = [
  { key: "day", label: "Theo ngày" },
  { key: "month", label: "Theo tháng" },
] as const;

const LOAD_ERROR = "Không tải được báo cáo doanh thu.";
const MAX_DAYS = 400; // backend assertReportRange: tối đa 400 ngày (day) / 60 tháng (month)
const MAX_MONTHS = 60;
const COLUMNS = 8;

function daySpan(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

/* Chặn khoảng ngày sai TRƯỚC khi gọi — backend cũng 400 nhưng báo ngay tại ô chọn thì nhân viên sửa nhanh hơn. */
function rangeError(r: DateRange, granularity: "day" | "month"): string | null {
  if (!r.from || !r.to) return "Chọn đủ ngày bắt đầu và ngày kết thúc.";
  if (r.from > r.to) return "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.";
  if (granularity === "month") {
    const months = (Number(r.to.slice(0, 4)) - Number(r.from.slice(0, 4))) * 12 + (Number(r.to.slice(5, 7)) - Number(r.from.slice(5, 7))) + 1;
    return months > MAX_MONTHS ? `Báo cáo theo tháng tối đa ${MAX_MONTHS} tháng — chọn khoảng ngắn hơn.` : null;
  }
  return daySpan(r.from, r.to) > MAX_DAYS ? `Báo cáo theo ngày tối đa ${MAX_DAYS} ngày — chọn khoảng ngắn hơn hoặc chuyển sang xem theo tháng.` : null;
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/*
 * CSV mở được bằng Excel: BOM UTF-8 để giữ tiếng Việt có dấu, dòng `sep=,` vì
 * Excel bản tiếng Việt dùng dấu ";" làm ngăn cách mặc định và sẽ dồn cả dòng
 * vào một cột nếu không được báo trước. Tiền xuất số VND thô (amount), không
 * phải chuỗi "1.200.000 ₫", để cộng trừ được.
 */
function buildRevenueCsv(d: ShopRevenueResponse): string {
  const header = ["Kỳ", "Doanh thu (VND)", "Số đơn", "Đơn tính doanh thu", "Đơn huỷ", "Sản phẩm bán ra", "Giảm giá của shop (VND)", "Hoàn tiền (VND)"];
  const row = (label: string, p: ShopRevenueResponse["total"]) => [label, p.revenue.amount, p.orderCount, p.paidCount, p.cancelledCount, p.itemsSold, p.discount.amount, p.refunded.amount];
  const lines = [header, ...d.points.map((p) => row(p.period, p)), row("Tổng", d.total)];
  return `﻿sep=,\r\n${lines.map((l) => l.map(csvCell).join(",")).join("\r\n")}`;
}

function downloadCsv(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/*
 * Báo cáo doanh thu của shop: chọn khoảng ngày + độ chi tiết ngày/tháng, thẻ
 * tổng, biểu đồ cột (doanh thu) + đường (số đơn), bảng theo kỳ, top sản phẩm
 * trong khoảng, xuất CSV phía client. Backend /shop/reports/revenue không trả
 * phí ship và khách mới theo kỳ nên bảng không có hai cột đó.
 */
export function ShopRevenueReport() {
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [granularity, setGranularity] = useState<"day" | "month">("day");

  const invalid = rangeError(range, granularity);
  const revenue = useShopRevenue({ ...range, granularity }, !invalid);
  // Top sản phẩm giới hạn 400 NGÀY kể cả khi xem theo tháng (backend assertReportRange(..., 'day')).
  const topAllowed = !invalid && daySpan(range.from, range.to) <= MAX_DAYS;
  const top = useShopTopProducts({ ...range, limit: 10 }, topAllowed);

  if (isForbiddenError(revenue.error)) return <ApiErrorState error={revenue.error} fallback={LOAD_ERROR} />;

  const data = invalid ? undefined : revenue.data;
  const loading = !invalid && revenue.isPending;
  const t = data?.total;
  const chartPoints: ShopChartPoint[] | undefined = data?.points.map((p) => ({ period: p.period, revenue: p.revenue, orderCount: p.orderCount }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker value={range} onChange={setRange} />
        <FilterTabs tabs={GRANULARITY} value={granularity} onChange={(v) => setGranularity(v as "day" | "month")} />
        {revenue.isFetching && !invalid ? <Loader2Icon className="size-4 animate-spin text-muted-foreground" /> : null}
        <Button
          variant="outline"
          className="ml-auto"
          disabled={!data}
          onClick={() => data && downloadCsv(`doanh-thu-shop_${data.from}_${data.to}_${data.granularity}.csv`, buildRevenueCsv(data))}
        >
          <DownloadIcon className="size-4" />
          Xuất CSV
        </Button>
      </div>

      {invalid ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {invalid}
        </p>
      ) : revenue.error ? (
        <ApiErrorState error={revenue.error} fallback={LOAD_ERROR} compact />
      ) : null}

      <div className="flex gap-2 rounded-xl border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <InfoIcon className="mt-0.5 size-4 shrink-0" />
        <div className="flex flex-col gap-1">
          <p>{REVENUE_DEFINITION}</p>
          <p>
            Giảm giá = phần voucher shop tự chịu · Hoàn tiền = khoản hoàn đã xử lý xong, tính theo ngày hoàn · Đơn COD chỉ tính doanh thu khi đã thu tiền
            (giao thành công).
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Doanh thu" value={t?.revenue.display ?? "—"} tone="primary" loading={loading} />
        <StatCard
          label="Đơn hàng"
          value={t ? formatNumber(t.orderCount) : "—"}
          hint={t ? `${formatNumber(t.paidCount)} tính doanh thu · ${formatNumber(t.cancelledCount)} huỷ` : undefined}
          loading={loading}
        />
        <StatCard label="Sản phẩm bán ra" value={t ? formatNumber(t.itemsSold) : "—"} loading={loading} />
        <StatCard label="Giảm giá của shop" value={t?.discount.display ?? "—"} hint={t ? `Hoàn tiền ${t.refunded.display}` : undefined} loading={loading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Biểu đồ doanh thu</CardTitle>
        </CardHeader>
        <CardContent>{loading || !chartPoints ? <Skeleton className="h-72 w-full rounded-lg" /> : <RevenueChart points={chartPoints} />}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chi tiết theo kỳ</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Kỳ</TableHead>
                <TableHead className="text-right">Doanh thu</TableHead>
                <TableHead className="text-right">Đơn</TableHead>
                <TableHead className="text-right">Tính doanh thu</TableHead>
                <TableHead className="text-right">Huỷ</TableHead>
                <TableHead className="text-right">SP bán</TableHead>
                <TableHead className="text-right">Giảm giá</TableHead>
                <TableHead className="text-right">Hoàn tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: COLUMNS }).map((_, j) => (
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
                  <TableCell colSpan={COLUMNS} className="h-20 text-center text-sm text-muted-foreground">
                    Không có số liệu trong khoảng này.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {t ? (
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Tổng</TableCell>
                  <TableCell className="text-right font-semibold">{t.revenue.display}</TableCell>
                  <TableCell className="text-right font-semibold">{formatNumber(t.orderCount)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatNumber(t.paidCount)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatNumber(t.cancelledCount)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatNumber(t.itemsSold)}</TableCell>
                  <TableCell className="text-right font-semibold">{t.discount.display}</TableCell>
                  <TableCell className="text-right font-semibold">{t.refunded.display}</TableCell>
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </CardContent>
      </Card>

      {invalid ? null : !topAllowed ? (
        <p className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Top sản phẩm chỉ xem được với khoảng tối đa {MAX_DAYS} ngày — thu hẹp khoảng ngày để xem.
        </p>
      ) : (
        <ShopTopProductsCard
          rows={top.data}
          loading={top.isPending}
          error={top.error}
          title="Sản phẩm bán chạy trong khoảng"
          description="Top 10 theo số lượng bán ròng (đã trừ hàng trả và giảm giá của shop)"
        />
      )}
    </div>
  );
}
