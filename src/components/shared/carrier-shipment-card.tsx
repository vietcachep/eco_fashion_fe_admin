"use client";

import type { ReactNode } from "react";
import { TruckIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailList } from "@/components/shared/detail-list";
import { StatusBadge } from "@/components/shared/status-badge";
import { SHIPMENT_CREATE_STATUS, SHIPMENT_STATUS, statusMeta } from "@/lib/labels";
import { formatDateTime, formatVnd } from "@/lib/format";
import type { ShipmentSummary } from "@/types/shipping";

function money(value: string | null): string {
  if (value === null) return "Chưa xác định";
  return formatVnd(value);
}

/* Khối thuần hiển thị để đơn vendor/sàn dùng cùng ngôn ngữ; thao tác/API nằm trong feature chủ quản. */
export function CarrierShipmentCard({ shipment, actions, emptyMessage }: { shipment?: ShipmentSummary | null; actions?: ReactNode; emptyMessage?: string }) {
  const state = shipment ? statusMeta(shipment.createStatus === "created" ? SHIPMENT_STATUS : SHIPMENT_CREATE_STATUS, shipment.createStatus === "created" ? shipment.status ?? "awaiting_pickup" : shipment.createStatus) : null;
  return <Card>
    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TruckIcon className="size-4" /> Vận chuyển {state ? <StatusBadge tone={state.tone}>{state.label}</StatusBadge> : null}</CardTitle></CardHeader>
    <CardContent className="flex flex-col gap-4">
      {shipment ? <>
        {shipment.simulated ? <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Vận đơn giả lập — dùng để trình diễn, không phát sinh giao hàng thật.</p> : null}
        <DetailList rows={[
          { label: "Hãng", value: shipment.provider === "fake" ? "GHN giả lập" : "GHN" },
          { label: "Mã vận đơn", value: shipment.carrierOrderCode ? <span className="font-mono">{shipment.carrierOrderCode}</span> : "Đang chờ hãng xác nhận" },
          { label: "Lần tạo", value: shipment.attemptNo },
          { label: "Bàn giao thực tế", value: shipment.pickedUpAt ? formatDateTime(shipment.pickedUpAt) : "Chưa xác nhận lấy hàng" },
          { label: "Dự kiến giao", value: shipment.expectedDeliveryAt ? formatDateTime(shipment.expectedDeliveryAt) : "Chưa có" },
          { label: "Phí đã báo", value: money(shipment.quotedFee) },
          { label: "Phí hãng cập nhật", value: money(shipment.actualFee) },
          { label: "Thu hộ", value: money(shipment.codAmount) },
        ]} />
        {!shipment.pickedUpAt && shipment.createStatus === "created" ? <p className="text-sm text-muted-foreground">Hãng đã nhận yêu cầu lấy hàng. Chỉ khi hãng xác nhận lấy kiện, đơn mới được ghi nhận đã bàn giao.</p> : null}
        {shipment.cancelStatus === "requested" || shipment.cancelStatus === "unknown" ? <p className="text-sm text-amber-700">Đang xác minh huỷ với hãng. Chưa hoàn tiền hoặc nhập kho lại.</p> : null}
        {shipment.error ? <p role="alert" className="text-sm text-destructive">{shipment.error}</p> : null}
        {shipment.events?.length ? <ol className="space-y-3 border-l pl-4">{shipment.events.map((event) => <li key={event.id} className="text-sm"><p className="font-medium">{statusMeta(SHIPMENT_STATUS, event.rawStatus).label}</p><p className="text-xs text-muted-foreground">{event.eventTime ? formatDateTime(event.eventTime) : "Đang xác minh thời điểm"}{event.status === "pending_verify" ? " · Đang xác minh với hãng" : ""}</p></li>)}</ol> : null}
      </> : <p className="text-sm text-muted-foreground">{emptyMessage || "Đơn chưa có vận đơn. Chuẩn bị và đóng gói hàng trước khi yêu cầu hãng lấy kiện."}</p>}
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </CardContent>
  </Card>;
}
