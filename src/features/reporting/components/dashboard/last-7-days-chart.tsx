"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyPoint } from "@/features/reporting/types/reporting";

/*
 * Cột doanh thu + đường số đơn, 7 ngày gần nhất. Tải lười qua next/dynamic từ
 * dashboard-screen. Doanh thu (chuỗi VND) đổi sang số để vẽ; tooltip hiện
 * chuỗi `display` từ backend.
 */
export function Last7DaysChart({ points }: { points: DailyPoint[] }) {
  const data = points.map((p) => ({
    day: p.day.slice(5),
    revenue: Number(p.revenue.amount),
    revenueDisplay: p.revenue.display,
    orders: p.orderCount,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
          <YAxis
            yAxisId="rev"
            tick={{ fontSize: 11 }}
            stroke="var(--muted-foreground)"
            tickFormatter={(v: number) =>
              v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}tr` : `${Math.round(v / 1000)}k`
            }
            width={48}
          />
          <YAxis
            yAxisId="ord"
            orientation="right"
            tick={{ fontSize: 11 }}
            stroke="var(--muted-foreground)"
            width={32}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(value, name, item) =>
              name === "Doanh thu"
                ? [(item.payload as { revenueDisplay: string }).revenueDisplay, name]
                : [value, name]
            }
            contentStyle={{ borderRadius: 10, fontSize: 13 }}
          />
          <Bar yAxisId="rev" dataKey="revenue" name="Doanh thu" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
          <Line
            yAxisId="ord"
            type="monotone"
            dataKey="orders"
            name="Số đơn"
            stroke="var(--chart-2)"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
