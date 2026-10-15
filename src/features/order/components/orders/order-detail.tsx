"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ImageIcon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { DetailList } from "@/components/shared/detail-list";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDateTime, formatNumber } from "@/lib/format";
import { ORDER_PAYMENT_STATUS, ORDER_STATUS, statusMeta, paymentMethodLabel } from "@/lib/labels";
import { useAdminOrder } from "@/features/order/hooks/use-orders";
import { STAFF_TRANSITIONS, STATUS_ACTION_LABEL } from "@/features/order/types/order";
import { UpdateStatusDialog } from "@/features/order/components/orders/update-status-dialog";
import { CancelOrderDialog } from "@/features/order/components/orders/cancel-order-dialog";

const LOAD_ERROR = "Không tải được đơn hàng.";

/*
 * Chi tiết đơn: dòng hàng, tiền, người nhận, thanh toán, lịch sử trạng thái.
 * Nút hành động sinh từ STAFF_TRANSITIONS theo trạng thái hiện tại: chuyển
 * trạng thái (dialog kèm link vận chuyển / ghi chú) hoặc huỷ (dialog lý do).
 */
export function OrderDetail({ code }: { code: string }) {
  const { data: o, isPending, error } = useAdminOrder(code);
  const [next, setNext] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;
  if (isPending || !o) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const status = statusMeta(ORDER_STATUS, o.status);
  const pay = statusMeta(ORDER_PAYMENT_STATUS, o.paymentStatus);
  const transitions = STAFF_TRANSITIONS[o.status] ?? [];
  const statusActions = transitions.filter((t) => t in STATUS_ACTION_LABEL);
  const canCancel = transitions.includes("cancelled");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={`Đơn ${o.code}`} description={`Đặt lúc ${formatDateTime(o.createdAt)} · ${o.items.length} dòng hàng`}>
        <StatusBadge tone={status.tone}>{o.statusLabel || status.label}</StatusBadge>
        <Button variant="outline" nativeButton={false} render={<Link href={ROUTES.order.orders} />}>
          <ArrowLeftIcon className="size-4" />
          Danh sách
        </Button>
        <PermissionGate permission={PERMISSIONS.orderStatusUpdate}>
          {statusActions.map((s) => (
            <Button key={s} onClick={() => setNext(s)}>
              {STATUS_ACTION_LABEL[s]}
            </Button>
          ))}
        </PermissionGate>
        {canCancel ? (
          <PermissionGate permission={PERMISSIONS.orderCancel}>
            <Button variant="destructive" onClick={() => setCancelOpen(true)}>
              <XCircleIcon className="size-4" />
              Huỷ đơn
            </Button>
          </PermissionGate>
        ) : null}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sản phẩm</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead className="text-right">Đơn giá</TableHead>
                    <TableHead className="text-right">SL</TableHead>
                    <TableHead className="text-right">Thành tiền</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {o.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
                            {it.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element -- ảnh động
                              <img src={it.imageUrl} alt="" className="size-full object-cover" />
                            ) : (
                              <ImageIcon className="size-4 text-muted-foreground/60" />
                            )}
                          </div>
                          <div className="min-w-0 leading-tight">
                            <Link href={`${ROUTES.product.products}/${it.productId}`} className="font-medium hover:underline">
                              {it.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {it.color} · {it.size} · <code className="font-mono">{it.sku}</code>
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{it.unitPrice.display}</TableCell>
                      <TableCell className="text-right">{formatNumber(it.quantity)}</TableCell>
                      <TableCell className="text-right font-medium">{it.lineTotal.display}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex flex-col items-end gap-1 border-t px-4 py-3 text-sm">
                <p>
                  Tạm tính <b className="ml-2">{o.subtotal.display}</b>
                </p>
                <p>
                  Phí vận chuyển <b className="ml-2">{o.shippingFee.display}</b>
                </p>
                <p>
                  Giảm giá{o.promotion ? ` (${o.promotion.code})` : ""} <b className="ml-2">−{o.discount.display}</b>
                </p>
                <p className="text-base">
                  Tổng cộng <b className="ml-2 text-primary">{o.total.display}</b>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lịch sử trạng thái</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative flex flex-col gap-3 border-l pl-4">
                {o.history.map((h, i) => (
                  <li key={i} className="relative text-sm">
                    <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-background bg-primary" />
                    <p className="font-medium">{h.toStatusLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(h.createdAt)}
                      {h.note ? ` · ${h.note}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Giao hàng</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList
                rows={[
                  { label: "Người nhận", value: o.recipientName },
                  { label: "SĐT", value: o.recipientPhone },
                  { label: "Địa chỉ", value: o.shippingAddress },
                  { label: "Ghi chú khách", value: o.customerNote || "—" },
                  {
                    label: "Theo dõi",
                    value: o.trackingUrl ? (
                      <a href={o.trackingUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        Mở link vận chuyển
                      </a>
                    ) : (
                      "—"
                    ),
                  },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thanh toán</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList
                rows={[
                  { label: "Phương thức", value: paymentMethodLabel(o.paymentMethodCode) },
                  { label: "Trạng thái", value: <StatusBadge tone={pay.tone}>{pay.label}</StatusBadge> },
                  { label: "Mã giao dịch", value: o.transactionCode ? <code className="font-mono">{o.transactionCode}</code> : "—" },
                  { label: "Thẻ", value: o.cardBrand ? `${o.cardBrand} •••• ${o.cardLast4 ?? ""}` : "—" },
                  { label: "Hết hạn TT", value: formatDateTime(o.paymentExpiresAt) },
                  { label: "Lý do huỷ", value: o.cancelReason || "—" },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <UpdateStatusDialog code={o.code} next={next} onClose={() => setNext(null)} />
      <CancelOrderDialog code={o.code} open={cancelOpen} onOpenChange={setCancelOpen} />
    </div>
  );
}
