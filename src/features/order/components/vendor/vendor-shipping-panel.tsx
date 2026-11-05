"use client";

import { useRef, useState } from "react";
import { PrinterIcon, RefreshCwIcon, TruckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { CarrierShipmentCard } from "@/components/shared/carrier-shipment-card";
import { usePermission } from "@/hooks/use-permission";
import { PERMISSIONS } from "@/lib/constants";
import { useOrderShipments, useOrderShippingAction, useOrderShippingLabel } from "@/features/order/hooks/use-order-shipping";
import type { CarrierOrderFields } from "@/types/shipping";

/* Yêu cầu lấy hàng không phải xác nhận bàn giao; trạng thái hãng là nguồn sự thật. Không cập nhật lạc quan khi tạo/đối soát. */
export function VendorShippingPanel({ order }: { order: CarrierOrderFields & { code: string; status: string; cancelRequest?: { status: string } | null } }) {
  const shipments = useOrderShipments(order.code, true);
  const ship = useOrderShippingAction(order.code, "ship");
  const reconcile = useOrderShippingAction(order.code, "shipping/reconcile");
  const label = useOrderShippingLabel(order.code);
  const canUpdate = usePermission(PERMISSIONS.shopOrderUpdate);
  const [labelHtml, setLabelHtml] = useState<string | null>(null);
  const labelFrame = useRef<HTMLIFrameElement>(null);
  const current = shipments.data?.find((s) => s.active) ?? shipments.data?.[0] ?? order.shipment;
  const pending = ship.isPending || reconcile.isPending;
  const canShip = order.canShip ?? (order.status === "packing" && order.cancelRequest?.status !== "pending" && (!current || !current.active));
  const operationError = ship.error || reconcile.error || label.error;
  async function showLabel() {
    const result = await label.mutateAsync();
    if (result.url && /^https:\/\//i.test(result.url)) window.open(result.url, "_blank", "noopener,noreferrer");
    else if (result.html) setLabelHtml(result.html);
  }
  return <div className="flex flex-col gap-3">
    {shipments.isPending && !order.shipment ? <Skeleton className="h-48 w-full rounded-xl" /> : <CarrierShipmentCard shipment={current} actions={<>
      {canUpdate && canShip ? <Button disabled={pending} onClick={() => ship.mutate()}><TruckIcon className="size-4" />Yêu cầu GHN lấy hàng</Button> : null}
      {canUpdate && current ? <Button variant="outline" disabled={pending} onClick={() => reconcile.mutate()}><RefreshCwIcon className="size-4" />{reconcile.isPending ? "Đang kiểm tra…" : "Kiểm tra với hãng"}</Button> : null}
      <Button variant="outline" disabled={shipments.isFetching} onClick={() => void shipments.refetch()}>Làm mới</Button>
      {current?.carrierOrderCode ? <Button variant="outline" disabled={label.isPending} onClick={() => void showLabel().catch(() => undefined)}><PrinterIcon className="size-4" />In nhãn vận chuyển</Button> : null}
    </>} />}
    {shipments.error ? <ApiErrorState compact error={shipments.error} fallback="Không tải được vận đơn. Hãy làm mới để kiểm tra." /> : null}
    {operationError ? <ApiErrorState compact error={operationError} fallback="Chưa thực hiện được thao tác vận chuyển." /> : null}
    {labelHtml ? <div className="rounded-xl border p-3"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-sm">Phiếu vận chuyển nội bộ</p><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => labelFrame.current?.contentWindow?.print()}>In phiếu</Button><Button variant="ghost" size="sm" onClick={() => setLabelHtml(null)}>Đóng phiếu</Button></div></div><iframe ref={labelFrame} title="Phiếu vận chuyển" sandbox="allow-modals allow-same-origin" srcDoc={labelHtml} className="h-[560px] w-full border" /></div> : null}
  </div>;
}
