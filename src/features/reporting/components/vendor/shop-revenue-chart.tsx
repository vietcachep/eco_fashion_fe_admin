"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ShopChartPoint } from "@/features/reporting/types/shop-reporting";

/* yyyy-mm-dd → dd/mm, yyyy-mm → mm/yyyy (nhãn trục ngắn gọn cho màn hẹp). */
function periodLabel(period: string): string {
  if (period.length === 10) return `${period.slice(8, 10)}/${period.slice(5, 7)}`;
  if (period.length === 7) return `${period.slice(5, 7)}/${period.slice(0, 4)}`;
  return period;
}

/*
 * Cột doanh thu + đường số đơn của shop (dashboard 7/30 ngày và báo cáo theo
 * kỳ). Tải lười qua next/dynamic từ màn gọi. Tooltip hiện chuỗi `display` của
 * backend; trục tiền rút gọn "tr"/"k" để không chiếm chỗ ở 390px.
 */
export function ShopRevenueChart({ points, height = 288 }: { points: ShopChartPoint[]; height?: number }) {
  const data = points.map((p) => ({
    label: periodLabel(p.period),
    revenue: Number(p.revenue.amount),
    revenueDisplay: p.revenue.display,
    orders: p.orderCount,
  }));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" minTickGap={14} />
          <YAxis
            yAxisId="rev"
            tick={{ fontSize: 11 }}
            stroke="var(--muted-foreground)"
            width={48}
            tickFormatter={(v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}tr` : `${Math.round(v / 1000)}k`)}
          />
          <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={30} allowDecimals={false} />
          <Tooltip
            formatter={(value, name, item) =>
              name === "Doanh thu" ? [(item.payload as { revenueDisplay: string }).revenueDisplay, name] : [value, name]
            }
            contentStyle={{ borderRadius: 10, fontSize: 13 }}
          />
          <Bar yAxisId="rev" dataKey="revenue" name="Doanh thu" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={36} />
          <Line yAxisId="ord" type="monotone" dataKey="orders" name="Số đơn" stroke="var(--chart-2)" strokeWidth={2} dot={data.length <= 31 ? { r: 2.5 } : false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
