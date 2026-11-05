"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CalendarClockIcon, ImageIcon, PackageCheckIcon, PackageXIcon, PrinterIcon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { DetailList } from "@/components/shared/detail-list";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import type { ShopUpdateOrderStatusRequestStatus } from "@/lib/api/generated/model";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDateTime, formatNumber } from "@/lib/format";
import { CANCELLED_BY_LABEL, DELIVERY_FAILED_REASON_LABEL, ORDER_STATUS, statusMeta, paymentMethodLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { usePermission } from "@/hooks/use-permission";
import { useNow } from "@/features/order/hooks/use-now";
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
import { ShopDeliveryFailedDialog } from "@/features/order/components/vendor/shop-delivery-failed-dialog";
import { ShopExtendShipDialog } from "@/features/order/components/vendor/shop-extend-ship-dialog";
import { ShopGoodsReturnedDialog } from "@/features/order/components/vendor/shop-goods-returned-dialog";
import { CancelRequestPanel } from "@/features/order/components/vendor/cancel-request-panel";
import { OrderRefundBadge } from "@/features/order/components/orders/order-refund-badge";
import { OrderCancelCard } from "@/features/order/components/orders-common/order-cancel-info";
import { OrderDueByStatus } from "@/features/order/components/orders-common/order-due";
import { shippingRows } from "@/features/order/components/orders-common/order-shipping-rows";
import { VendorShippingPanel } from "@/features/order/components/vendor/vendor-shipping-panel";

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
  if (o.fulfilmentMode === "carrier" && (o.status === "packing" || o.status === "shipping")) {
    return { title: o.status === "packing" ? "Chuẩn bị để hãng lấy hàng" : "Hãng đang xử lý vận chuyển", description: "Đóng gói và yêu cầu GHN lấy hàng ở khung vận chuyển. Hãng sẽ xác nhận lấy kiện và cập nhật hành trình; shop không cần đánh dấu giao thành công.", tone: "info" };
  }
  switch (o.status) {
    case "pending":
      if (isAwaitingOnlinePayment(o)) {
        return {
          title: "Chờ khách thanh toán",
          description: `Đơn thanh toán online (${paymentMethodLabel(o.paymentMethodCode)}) — chưa nhận được tiền nên chưa xác nhận được.${
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
      if (o.cancelRequest?.status === "pending") {
        return {
          title: "Khách yêu cầu huỷ đơn — cần xử lý",
          description: "Khách muốn huỷ khi đơn đang đóng gói. Chấp nhận hoặc từ chối ở khung bên dưới trước hạn; quá hạn hệ thống tự chấp nhận và huỷ đơn.",
          tone: "warning",
        };
      }
      return {
        title: "Đang đóng gói",
        description: "Đóng gói xong thì giao cho đơn vị vận chuyển: chọn hãng vận chuyển và nhập mã vận đơn (bắt buộc) để khách theo dõi được hành trình.",
        tone: "info",
      };
    case "shipping":
      return {
        title: "Đang giao hàng",
        description: isCod
          ? "Khi khách nhận hàng, bấm \"Đã giao thành công\" và xác nhận đã thu tiền mặt — shop giữ tiền mặt, sàn tự trừ hoa hồng của đơn khỏi ví cọc COD (đơn COD không vào kỳ chi trả). Giao không được (khách từ chối, không liên lạc được, thất lạc…) thì bấm \"Giao không thành công\"."
          : "Khi khách nhận hàng, bấm \"Đã giao thành công\". Giao không được (khách từ chối, không liên lạc được, thất lạc…) thì bấm \"Giao không thành công\".",
        tone: "info",
      };
    case "delivered":
      return { title: "Đã giao", description: "Sàn tự hoàn tất đơn sau thời hạn đổi trả nếu khách không khiếu nại — shop không cần thao tác thêm.", tone: "done" };
    case "completed":
      return { title: "Đơn đã hoàn tất", description: "Doanh thu đã được ghi nhận vào báo cáo của shop.", tone: "done" };
    case "cancelled":
      return cancelledStep(o);
    case "returned":
      return { title: "Đơn đã được trả hàng", description: "Shop đã xác nhận nhận lại hàng trả và khách được hoàn tiền theo yêu cầu đổi trả.", tone: "done" };
    default:
      return { title: statusMeta(ORDER_STATUS, o.status).label, description: "", tone: "info" };
  }
}

/* Đơn đã huỷ: nói rõ AI huỷ & vì sao; đơn huỷ do giao không thành công thì nói thêm hàng đã về kho chưa (nút "Hàng đã về kho" nằm ở khung này). */
function cancelledStep(o: ShopOrderDetail): StepInfo {
  if (o.deliveryFailedAt) {
    const reason = (o.deliveryFailedReason && DELIVERY_FAILED_REASON_LABEL[o.deliveryFailedReason]) || o.deliveryFailedReason || "giao không thành công";
    const stock = o.goodsReturnedAt
      ? `Hàng đã nhập kho lại lúc ${formatDateTime(o.goodsReturnedAt)}.`
      : o.canConfirmGoodsReturned
        ? "Hàng chưa nhập kho: khi nhận lại hàng, bấm \"Hàng đã về kho\" để cộng lại tồn kho (trong 30 ngày kể từ lúc báo)."
        : "Hàng chưa được nhập kho lại.";
    return { title: "Giao không thành công — đơn đã huỷ", description: `${reason}. ${stock}`, tone: "danger" };
  }
  const by = o.cancelledBy ? CANCELLED_BY_LABEL[o.cancelledBy] : null;
  return {
    title: by ? `Đơn đã được huỷ bởi ${by.toLowerCase()}` : "Đơn đã huỷ",
    description: o.cancelReason ? `Lý do: ${o.cancelReason}` : "Hàng giữ đã được nhả về kho.",
    tone: "danger",
  };
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
 * link thanh toán) nên màn chỉ hiện phương thức + trạng thái. Nút chuyển trạng thái / gia hạn / giao thất bại / hàng về kho gate
 * `shop.order.update`; huỷ đơn + xử lý yêu cầu huỷ gate `shop.order.cancel` (PLAN-0027). Nút hợp lệ lấy từ lưới VENDOR_TRANSITIONS
 * của backend và các cờ `canCancel` / `canConfirmGoodsReturned` của response.
 */
export function VendorOrderDetail({ code }: { code: string }) {
  const { data: o, isPending, error } = useShopOrder(code);
  const now = useNow();
  const canUpdate = usePermission(PERMISSIONS.shopOrderUpdate);
  const canCancelPermission = usePermission(PERMISSIONS.shopOrderCancel);
  const [statusDialog, setStatusDialog] = useState<{ next: ShopUpdateOrderStatusRequestStatus | null; open: boolean }>({ next: null, open: false });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [failedOpen, setFailedOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [returnedOpen, setReturnedOpen] = useState(false);

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;
  if (isPending || !o) return <DetailSkeleton />;

  const status = statusMeta(ORDER_STATUS, o.status);
  const step = stepInfo(o);
  const next = VENDOR_NEXT_STATUS[o.status];
  const blocked = isAwaitingOnlinePayment(o);
  const isCod = o.paymentMethodCode === "cod";
  const paidOnline = !isCod && (o.paymentStatus === "paid" || o.paymentStatus === "partially_refunded");
  const showShopDiscount = hasMoney(o.shopDiscount) || !!o.shopPromotion;
  const showPlatformDiscount = hasMoney(o.platformDiscount) || !!o.promotion;

  // Gia hạn giao: một lần, đơn đã xác nhận / đóng gói và CHƯA quá hạn (quá hạn backend từ chối ORDER_SHIP_OVERDUE nên không mời bấm).
  const extendable =
    (o.status === "confirmed" || o.status === "packing") && !o.shipExtended && !!o.shipDueAt && new Date(o.shipDueAt).getTime() > now;
  // Mỗi nút gắn đúng quyền của nó: update (chuyển trạng thái · gia hạn · giao thất bại · hàng về kho) tách khỏi cancel (huỷ đơn · xử lý yêu cầu huỷ).
  const carrierManaged = o.fulfilmentMode === "carrier";
  const showNext = canUpdate && !!next && !(carrierManaged && (next === "shipping" || next === "delivered"));
  const showExtend = canUpdate && extendable;
  const showFailed = canUpdate && !carrierManaged && o.status === "shipping";
  const showReturned = canUpdate && !carrierManaged && o.canConfirmGoodsReturned;
  const showCancel = canCancelPermission && o.canCancel;
  const hasAction = showNext || showExtend || showFailed || showReturned || showCancel;
  // Có việc để làm ở trạng thái này nhưng người xem thiếu quyền → nói rõ thay vì để khung trống.
  const hasPossibleAction = (!!next && !(carrierManaged && (next === "shipping" || next === "delivered"))) || extendable || (!carrierManaged && (o.status === "shipping" || o.canConfirmGoodsReturned)) || o.canCancel;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={`Đơn ${o.code}`} description={`Đặt lúc ${formatDateTime(o.createdAt)} · ${formatNumber(o.items.length)} dòng hàng`}>
        <StatusBadge tone={status.tone}>{o.statusLabel || status.label}</StatusBadge>
        {o.shipExtended ? <StatusBadge tone="neutral">Đã gia hạn giao</StatusBadge> : null}
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
          <div className="pt-1.5">
            <OrderDueByStatus order={o} now={now} />
          </div>
        </div>
        {hasPossibleAction ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            {showNext && next ? (
              <Button disabled={blocked} onClick={() => setStatusDialog({ next, open: true })}>
                {VENDOR_ACTION_LABEL[next]}
              </Button>
            ) : null}
            {showExtend ? (
              <Button variant="outline" onClick={() => setExtendOpen(true)}>
                <CalendarClockIcon className="size-4" />
                Gia hạn giao hàng
              </Button>
            ) : null}
            {/* Lối thoát cho đơn kẹt `shipping`: từ PLAN-0031 §2.4 dùng quyền `shop.order.update` (trước là shop.return.process). */}
            {showFailed ? (
              <Button variant="outline" onClick={() => setFailedOpen(true)}>
                <PackageXIcon className="size-4" />
                Giao không thành công
              </Button>
            ) : null}
            {showReturned ? (
              <Button onClick={() => setReturnedOpen(true)}>
                <PackageCheckIcon className="size-4" />
                Hàng đã về kho
              </Button>
            ) : null}
            {showCancel ? (
              <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                <XCircleIcon className="size-4" />
                Huỷ đơn
              </Button>
            ) : null}
            {!hasAction ? <p className="text-xs text-muted-foreground">Bạn chỉ có quyền xem đơn.</p> : null}
          </div>
        ) : null}
      </div>

      {o.cancelRequest ? <CancelRequestPanel code={o.code} request={o.cancelRequest} paidOnline={paidOnline} now={now} /> : null}
      {carrierManaged ? <VendorShippingPanel order={o} /> : null}

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
                  ...shippingRows(o),
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
                  { label: "Phương thức", value: paymentMethodLabel(o.paymentMethodCode) },
                  {
                    label: "Trạng thái",
                    value: <ShopPaymentBadge method={o.paymentMethodCode} status={o.paymentStatus} carrierCodStatus={o.carrierCodStatus} showMethod={false} />,
                  },
                  ...(blocked && o.paymentExpiresAt ? [{ label: "Hạn thanh toán", value: formatDateTime(o.paymentExpiresAt) }] : []),
                  ...(o.refund ? [{ label: "Hoàn tiền", value: <OrderRefundBadge refund={o.refund} /> }] : []),
                ]}
              />
              {isCod && o.paymentStatus !== "paid" ? (
                <p className="rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">
                  {carrierManaged ? <>GHN thu hộ <b className="text-foreground">{o.total.display}</b> khi giao hàng; shop không tự thu tiền. {o.carrierCodStatus === "collected_pending_remittance" ? "Hãng đã thu, sàn đang đối chiếu tiền về." : ""}</> : <>Đơn COD: thu <b className="text-foreground">{o.total.display}</b> tiền mặt khi giao hàng.</>}
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

          <OrderCancelCard order={o} />
        </div>
      </div>

      <ShopOrderStatusDialog
        code={o.code}
        next={statusDialog.next}
        open={statusDialog.open}
        isCod={isCod}
        onOpenChange={(open) => setStatusDialog((s) => ({ ...s, open }))}
      />
      <ShopCancelOrderDialog
        code={o.code}
        status={o.status}
        paidOnline={paidOnline}
        hadRejectedRequest={o.cancelRequest?.status === "rejected"}
        carrierManaged={carrierManaged}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
      />
      <ShopDeliveryFailedDialog code={o.code} paidOnline={paidOnline} open={failedOpen} onOpenChange={setFailedOpen} />
      <ShopExtendShipDialog code={o.code} shipDueAt={o.shipDueAt} open={extendOpen} onOpenChange={setExtendOpen} />
      <ShopGoodsReturnedDialog code={o.code} open={returnedOpen} onOpenChange={setReturnedOpen} />
      <ShopOrderPrintSlip order={o} />
    </div>
  );
}
