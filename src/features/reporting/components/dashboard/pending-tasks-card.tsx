"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import type { DashboardResponse } from "@/features/reporting/types/reporting";

/*
 * Dải "việc đang chờ" — mỗi ô là một link dẫn thẳng tới màn xử lý có sẵn bộ
 * lọc tương ứng, để nhân viên bấm một phát là tới việc.
 */
const ITEMS: Array<{
  key: keyof DashboardResponse["pending"];
  label: string;
  href: string;
}> = [
  { key: "awaitingConfirm", label: "Đơn chờ xác nhận", href: `${ROUTES.order.orders}?status=pending` },
  { key: "awaitingPayment", label: "Đơn chờ thanh toán", href: `${ROUTES.order.orders}?paymentStatus=unpaid` },
  { key: "packing", label: "Đang đóng gói", href: `${ROUTES.order.orders}?status=packing` },
  { key: "shipping", label: "Đang giao", href: `${ROUTES.order.orders}?status=shipping` },
  { key: "returnsRequested", label: "Đổi trả chờ duyệt", href: `${ROUTES.order.returns}?status=requested` },
  { key: "refundsRequested", label: "Hoàn tiền chờ xử lý", href: `${ROUTES.payment.refunds}?status=requested` },
];

export function PendingTasksCard({
  pending,
  loading,
}: {
  pending?: DashboardResponse["pending"];
  loading: boolean;
}) {
  return (
    <Card className="py-0">
      <CardContent className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border p-0 sm:grid-cols-4 xl:grid-cols-7">
        {ITEMS.map((it) => {
          const n = pending?.[it.key] ?? 0;
          return (
            <Link
              key={it.key}
              href={it.href}
              className="flex flex-col gap-1 bg-card px-4 py-3 transition-colors hover:bg-muted/60"
            >
              <span className="text-xs text-muted-foreground">{it.label}</span>
              {loading ? (
                <Skeleton className="h-6 w-10 rounded" />
              ) : (
                <span
                  className={
                    n > 0
                      ? "font-heading text-xl font-semibold text-primary"
                      : "font-heading text-xl font-semibold"
                  }
                >
                  {formatNumber(n)}
                </span>
              )}
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
