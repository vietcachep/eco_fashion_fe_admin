"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RevenuePoint } from "@/features/reporting/types/reporting";

/* Đường doanh thu theo kỳ (tải lười). Tooltip hiện chuỗi `display` của backend. */
export function RevenueChart({ points }: { points: RevenuePoint[] }) {
  const data = points.map((p) => ({
    period: p.period.length > 7 ? p.period.slice(5) : p.period,
    revenue: Number(p.revenue.amount),
    display: p.revenue.display,
    orders: p.orderCount,
  }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" minTickGap={16} />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="var(--muted-foreground)"
            width={52}
            tickFormatter={(v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}tr` : `${Math.round(v / 1000)}k`)}
          />
          <Tooltip
            formatter={(value, name, item) => (name === "Doanh thu" ? [(item.payload as { display: string }).display, name] : [value, name])}
            contentStyle={{ borderRadius: 10, fontSize: 13 }}
          />
          <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="var(--chart-1)" strokeWidth={2} fill="url(#rev-fill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
