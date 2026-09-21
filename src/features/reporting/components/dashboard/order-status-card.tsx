"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/labels";
import type { DashboardResponse } from "@/features/reporting/types/reporting";

/* Phân bố trạng thái đơn + phương thức thanh toán (tháng này). */
export function OrderStatusCard({
  orderStatus,
  paymentMethods,
  loading,
}: {
  orderStatus?: DashboardResponse["orderStatus"];
  paymentMethods?: DashboardResponse["paymentMethods"];
  loading: boolean;
}) {
  const total = orderStatus?.reduce((s, r) => s + r.count, 0) ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Đơn hàng theo trạng thái</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full rounded" />
            ))}
          </div>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {(orderStatus ?? []).map((r) => {
              const pct = total ? Math.round((r.count / total) * 100) : 0;
              return (
                <li key={r.status} className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>{ORDER_STATUS_LABEL[r.status] ?? r.status}</span>
                    <span className="font-medium">{formatNumber(r.count)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
            {orderStatus?.length === 0 ? <li className="text-muted-foreground">Chưa có đơn.</li> : null}
          </ul>
        )}

        <div>
          <p className="pb-2 text-xs font-medium text-muted-foreground">Phương thức thanh toán</p>
          {loading ? (
            <Skeleton className="h-12 w-full rounded" />
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {(paymentMethods ?? []).map((m) => (
                <li key={m.method} className="flex justify-between">
                  <span>{PAYMENT_METHOD_LABEL[m.method] ?? m.method}</span>
                  <span className="text-muted-foreground">
                    {formatNumber(m.count)} đơn ·{" "}
                    <span className="font-medium text-foreground">{m.revenue.display}</span>
                  </span>
                </li>
              ))}
              {paymentMethods?.length === 0 ? (
                <li className="text-muted-foreground">Chưa có giao dịch.</li>
              ) : null}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
