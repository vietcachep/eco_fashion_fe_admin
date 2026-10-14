"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ImageIcon, PrinterIcon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { DetailList } from "@/components/shared/detail-list";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import type { ShopUpdateOrderStatusRequestStatus } from "@/lib/api/generated/model";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDateTime, formatNumber } from "@/lib/format";
import { ORDER_STATUS, PAYMENT_METHOD_LABEL, statusMeta } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { useShopOrder } from "@/features/order/hooks/use-shop-orders";
import {
  isActionablePending,
  isAwaitingOnlinePayment,
  variantText,
  VENDOR_ACTION_LABEL,
  VENDOR_NEXT_STATUS,
  type ShopOrderDetail,
} from "@/features/order/types/shop-order";
import { ShopPaymentBadge } from "@/features/order/components/vendor/shop-payment-badge";
import { ShopOrderStatusDialog } from "@/features/order/components/vendor/shop-order-status-dialog";
import { ShopCancelOrderDialog } from "@/features/order/components/vendor/shop-cancel-order-dialog";
import { ShopOrderPrintSlip } from "@/features/order/components/vendor/shop-order-print-slip";

const LOAD_ERROR = "Không tải được đơn hàng.";

const hasMoney = (m: { amount: string }) => Number(m.amount) > 0;

interface StepInfo {
  title: string;
  description: string;
  tone: "info" | "warning" | "done" | "danger";
}

/* Việc shop cần làm tiếp theo ở từng trạng thái — nói rõ VÌ SAO nút bị khoá với đơn online chưa trả. */
function stepInfo(o: ShopOrderDetail): StepInfo {
  const isCod = o.paymentMethodCode === "cod";
  switch (o.status) {
    case "pending":
      if (isAwaitingOnlinePayment(o)) {
        return {
          title: "Chờ khách thanh toán",
          description: `Đơn thanh toán online (${PAYMENT_METHOD_LABEL[o.paymentMethodCode] ?? o.paymentMethodCode}) — chưa nhận được tiền nên chưa xác nhận được.${
            o.paymentExpiresAt ? ` Đơn tự huỷ nếu quá hạn lúc ${formatDateTime(o.paymentExpiresAt)}.` : ""
          }`,
          tone: "warning",
        };
      }
      return {
        title: "Chờ shop xác nhận",
        description: isCod
          ? "Đơn COD — xác nhận để giữ hàng cho khách, tiền thu khi giao."
          : "Khách đã thanh toán — xác nhận để giữ hàng và chuyển sang đóng gói.",
        tone: "info",
      };
    case "confirmed":
      return { title: "Chuẩn bị hàng", description: "Hàng đã được trừ kho. Bắt đầu đóng gói, in phiếu đóng gói để kèm vào kiện.", tone: "info" };
    case "packing":
      return { title: "Đang đóng gói", description: "Đóng gói xong thì giao cho đơn vị vận chuyển; có thể nhập link theo dõi (https) cho khách.", tone: "info" };
    case "shipping":
      return {
        title: "Đang giao hàng",
        description: isCod
          ? "Khi khách nhận hàng, bấm \"Đã giao thành công\" và xác nhận đã thu tiền mặt — hoa hồng sẽ trừ vào ví COD khi đơn hoàn tất."
          : "Khi khách nhận hàng, bấm \"Đã giao thành công\".",
        tone: "info",
      };
    case "delivered":
      return { title: "Đã giao", description: "Sàn tự hoàn tất đơn sau thời hạn đổi trả nếu khách không khiếu nại — shop không cần thao tác thêm.", tone: "done" };
    case "completed":
      return { title: "Đơn đã hoàn tất", description: "Doanh thu đã được ghi nhận vào báo cáo của shop.", tone: "done" };
    case "cancelled":
      return { title: "Đơn đã huỷ", description: o.cancelReason ? `Lý do: ${o.cancelReason}` : "Hàng giữ đã được nhả về kho.", tone: "danger" };
    case "returned":
      return { title: "Đơn đã được trả hàng", description: "Hàng trả về đã được sàn xử lý theo yêu cầu đổi trả của khách.", tone: "done" };
    default:
      return { title: statusMeta(ORDER_STATUS, o.status).label, description: "", tone: "info" };
  }
}

const STEP_TONE: Record<StepInfo["tone"], string> = {
  info: "border-primary/30 bg-primary/5",
  warning: "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
  done: "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
  danger: "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40",
};

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/*
 * Chi tiết đơn của shop: việc cần làm tiếp theo, dòng hàng (ảnh · biến thể · SKU),
 * tiền (voucher shop / voucher sàn tách riêng), người nhận, lịch sử trạng thái.
 * Backend đã che thông tin thanh toán chi tiết của khách (mã giao dịch, thẻ,
 * link thanh toán) nên màn chỉ hiện phương thức + trạng thái. Nút ghi gate
 * `shop.order.update`; nút hợp lệ lấy từ lưới VENDOR_TRANSITIONS của backend.
 */
export function VendorOrderDetail({ code }: { code: string }) {
  const { data: o, isPending, error } = useShopOrder(code);
  const [statusDialog, setStatusDialog] = useState<{ next: ShopUpdateOrderStatusRequestStatus | null; open: boolean }>({ next: null, open: false });
  const [cancelOpen, setCancelOpen] = useState(false);

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;
  if (isPending || !o) return <DetailSkeleton />;

  const status = statusMeta(ORDER_STATUS, o.status);
  const step = stepInfo(o);
  const next = VENDOR_NEXT_STATUS[o.status];
  const blocked = isAwaitingOnlinePayment(o);
  const isCod = o.paymentMethodCode === "cod";
  const paidOnline = !isCod && (o.paymentStatus === "paid" || o.paymentStatus === "partially_refunded");
  const canAct = !!next || o.canCancel;
  const showShopDiscount = hasMoney(o.shopDiscount) || !!o.shopPromotion;
  const showPlatformDiscount = hasMoney(o.platformDiscount) || !!o.promotion;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={`Đơn ${o.code}`} description={`Đặt lúc ${formatDateTime(o.createdAt)} · ${formatNumber(o.items.length)} dòng hàng`}>
        <StatusBadge tone={status.tone}>{o.statusLabel || status.label}</StatusBadge>
        <Button variant="outline" nativeButton={false} render={<Link href={ROUTES.vendor.orders} />}>
          <ArrowLeftIcon className="size-4" />
          <span className="hidden sm:inline">Danh sách</span>
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <PrinterIcon className="size-4" />
          <span className="sm:hidden">In phiếu</span>
          <span className="hidden sm:inline">In phiếu đóng gói</span>
        </Button>
      </PageHeader>

      <div className={cn("flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between", STEP_TONE[step.tone])}>
        <div className="min-w-0 text-sm">
          <p className="font-semibold">{step.title}</p>
          {step.description ? <p className="pt-0.5 text-muted-foreground">{step.description}</p> : null}
        </div>
        {canAct ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <PermissionGate
              permission={PERMISSIONS.shopOrderUpdate}
              fallback={<p className="text-xs text-muted-foreground">Bạn chỉ có quyền xem đơn.</p>}
            >
              {next ? (
                <Button disabled={blocked} onClick={() => setStatusDialog({ next, open: true })}>
                  {VENDOR_ACTION_LABEL[next]}
                </Button>
              ) : null}
              {o.canCancel ? (
                <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                  <XCircleIcon className="size-4" />
                  Huỷ đơn
                </Button>
              ) : null}
            </PermissionGate>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sản phẩm</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="flex flex-col divide-y border-y">
                {o.items.map((it) => {
                  const variant = variantText(it);
                  return (
                    <li key={it.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
                        {it.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- ảnh động
                          <img src={it.imageUrl} alt="" className="size-full object-cover" />
                        ) : (
                          <ImageIcon className="size-5 text-muted-foreground/60" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 text-sm leading-snug">
                        <Link href={`${ROUTES.vendor.products}/${it.productId}`} className="font-medium hover:underline">
                          {it.name}
                        </Link>
                        {variant ? <p className="text-muted-foreground">{variant}</p> : null}
                        <p className="text-xs text-muted-foreground">
                          SKU <code className="font-mono">{it.sku}</code>
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-sm leading-snug">
                        <p className="font-semibold">{it.lineTotal.display}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(it.quantity)} × {it.unitPrice.display}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <dl className="ml-auto grid max-w-md grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 px-4 py-3 text-sm">
                <dt className="text-muted-foreground">Tạm tính</dt>
                <dd className="text-right font-medium">{o.subtotal.display}</dd>

                <dt className="text-muted-foreground">Phí vận chuyển</dt>
                <dd className="text-right font-medium">{o.shippingFee.display}</dd>

                {showShopDiscount ? (
                  <>
                    <dt className="text-muted-foreground">
                      Giảm giá của shop
                      {o.shopPromotion ? <span className="ml-1 font-mono text-xs">({o.shopPromotion.code})</span> : null}
                    </dt>
                    <dd className="text-right font-medium">−{o.shopDiscount.display}</dd>
                  </>
                ) : null}

                {showPlatformDiscount ? (
                  <>
                    <dt className="font-medium text-emerald-700 dark:text-emerald-400">
                      Sàn hỗ trợ
                      {o.promotion ? <span className="ml-1 font-mono text-xs">(voucher sàn {o.promotion.code})</span> : null}
                    </dt>
                    <dd className="text-right font-semibold text-emerald-700 dark:text-emerald-400">−{o.platformDiscount.display}</dd>
                    <dd className="col-span-2 -mt-1 text-xs text-muted-foreground">
                      Khách được giảm phần này nhưng sàn chịu chi phí — sàn hoàn lại cho shop, không bị trừ vào doanh thu của bạn.
                    </dd>
                  </>
                ) : null}

                <dt className="border-t pt-2 text-base font-semibold">Khách trả</dt>
                <dd className="border-t pt-2 text-right text-base font-semibold text-primary">{o.total.display}</dd>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lịch sử trạng thái</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative ml-1 flex flex-col gap-3 border-l pl-4">
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
                  {
                    label: "SĐT",
                    value: (
                      <a href={`tel:${o.recipientPhone}`} className="text-primary hover:underline">
                        {o.recipientPhone}
                      </a>
                    ),
                  },
                  { label: "Địa chỉ", value: o.shippingAddress },
                  { label: "Ghi chú khách", value: o.customerNote || "—" },
                  {
                    label: "Theo dõi",
                    value:
                      o.trackingUrl && o.trackingUrl.startsWith("https://") ? (
                        <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
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
            <CardContent className="flex flex-col gap-3">
              <DetailList
                rows={[
                  { label: "Phương thức", value: PAYMENT_METHOD_LABEL[o.paymentMethodCode] ?? o.paymentMethodCode },
                  {
                    label: "Trạng thái",
                    value: <ShopPaymentBadge method={o.paymentMethodCode} status={o.paymentStatus} showMethod={false} />,
                  },
                  ...(blocked && o.paymentExpiresAt ? [{ label: "Hạn thanh toán", value: formatDateTime(o.paymentExpiresAt) }] : []),
                ]}
              />
              {isCod && o.paymentStatus !== "paid" ? (
                <p className="rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">
                  Đơn COD: thu <b className="text-foreground">{o.total.display}</b> tiền mặt khi giao hàng.
                </p>
              ) : null}
              {paidOnline ? (
                <p className="rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">
                  Khách đã thanh toán online — shop không thu thêm tiền. Chi tiết giao dịch do sàn quản lý.
                </p>
              ) : null}
              {isActionablePending(o) ? (
                <p className="text-xs font-medium text-primary">Đơn này cần shop xác nhận ngay.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <ShopOrderStatusDialog
        code={o.code}
        next={statusDialog.next}
        open={statusDialog.open}
        isCod={isCod}
        onOpenChange={(open) => setStatusDialog((s) => ({ ...s, open }))}
      />
      <ShopCancelOrderDialog code={o.code} paidOnline={paidOnline} open={cancelOpen} onOpenChange={setCancelOpen} />
      <ShopOrderPrintSlip order={o} />
    </div>
  );
}
