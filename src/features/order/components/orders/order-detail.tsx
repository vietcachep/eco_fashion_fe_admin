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
import { useNow } from "@/features/order/hooks/use-now";
import { useAdminOrder } from "@/features/order/hooks/use-orders";
import { pendingDue, STAFF_TRANSITIONS } from "@/features/order/types/order";
import { CancelOrderDialog } from "@/features/order/components/orders/cancel-order-dialog";
import { OrderRefundBadge } from "@/features/order/components/orders/order-refund-badge";
import { CancelRequestInfoCard, OrderCancelCard } from "@/features/order/components/orders-common/order-cancel-info";
import { OrderDueByStatus } from "@/features/order/components/orders-common/order-due";
import { shippingRows } from "@/features/order/components/orders-common/order-shipping-rows";
import { CarrierShipmentCard } from "@/components/shared/carrier-shipment-card";

const LOAD_ERROR = "Không tải được đơn hàng.";

/*
 * Chi tiết đơn: dòng hàng, tiền, người nhận, thanh toán, lịch sử trạng thái.
 * Sàn CHỈ giám sát: xác nhận / đóng gói / giao là việc của chủ shop (cổng vendor).
 * Sàn chỉ huỷ được đơn khi cần xử lý tranh chấp (dialog mã lý do + lý do) — kể cả đơn ĐÓNG GÓI (shop mất liên lạc) và ĐANG GIAO (hàng thất lạc,
 * khách từ chối nhận…), khi đó lý do ≥ 10 ký tự. Màn hiện thêm bằng chứng giao hàng (hãng + mã vận đơn), hạn của shop, ai huỷ & vì sao, và yêu cầu
 * huỷ của khách (chỉ xem — shop mới là bên chấp nhận / từ chối).
 */
export function OrderDetail({ code }: { code: string }) {
  const { data: o, isPending, error } = useAdminOrder(code);
  const [cancelOpen, setCancelOpen] = useState(false);
  const now = useNow();

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
  const operationPending = o.shipment && (o.shipment.createStatus === "creating" || o.shipment.createStatus === "unknown" || ["requested", "unknown"].includes(o.shipment.cancelStatus));
  const canCancel = transitions.includes("cancelled") && !(o.fulfilmentMode === "carrier" && (o.shipment?.pickedUpAt || operationPending));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={`Đơn ${o.code}`} description={`Đặt lúc ${formatDateTime(o.createdAt)} · ${o.items.length} dòng hàng`}>
        <StatusBadge tone={status.tone}>{o.statusLabel || status.label}</StatusBadge>
        {o.shipExtended ? <StatusBadge tone="neutral">Shop đã gia hạn giao</StatusBadge> : null}
        <Button variant="outline" nativeButton={false} render={<Link href={ROUTES.order.orders} />}>
          <ArrowLeftIcon className="size-4" />
          Danh sách
        </Button>
        {canCancel ? (
          <PermissionGate permission={PERMISSIONS.orderCancel}>
            <Button variant="destructive" onClick={() => setCancelOpen(true)}>
              <XCircleIcon className="size-4" />
              Huỷ đơn
            </Button>
          </PermissionGate>
        ) : null}
      </PageHeader>
      {o.fulfilmentMode === "carrier" ? <CarrierShipmentCard shipment={o.shipment} actions={<Button variant="outline" nativeButton={false} render={<Link href={`${ROUTES.shipping.shipments}?q=${encodeURIComponent(o.code)}`} />}>Xem quản lý vận chuyển</Button>} /> : null}

      {pendingDue(o) ? (
        <div className="rounded-xl border bg-muted/30 px-4 py-3">
          <OrderDueByStatus order={o} now={now} />
        </div>
      ) : null}

      {o.cancelRequest?.status === "pending" ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Khách đang yêu cầu huỷ đơn này — shop chấp nhận hoặc từ chối trước hạn, quá hạn hệ thống tự chấp nhận. Sàn chỉ huỷ thay khi tranh chấp.
        </div>
      ) : null}

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
                  ...shippingRows(o),
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
                  ...(o.refund ? [{ label: "Hoàn tiền", value: <OrderRefundBadge refund={o.refund} /> }] : []),
                  { label: "Mã giao dịch", value: o.transactionCode ? <code className="font-mono">{o.transactionCode}</code> : "—" },
                  { label: "Thẻ", value: o.cardBrand ? `${o.cardBrand} •••• ${o.cardLast4 ?? ""}` : "—" },
                  { label: "Hết hạn TT", value: formatDateTime(o.paymentExpiresAt) },
                ]}
              />
            </CardContent>
          </Card>
          <OrderCancelCard order={o} />
          {o.cancelRequest ? <CancelRequestInfoCard request={o.cancelRequest} /> : null}
        </div>
      </div>

      <CancelOrderDialog code={o.code} status={o.status} open={cancelOpen} onOpenChange={setCancelOpen} />
    </div>
  );
}
