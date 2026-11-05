"use client";

import { useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { CarrierShipmentCard } from "@/components/shared/carrier-shipment-card";
import { NativeSelect } from "@/components/shared/native-select";
import { StatusBadge } from "@/components/shared/status-badge";
import { useListState } from "@/hooks/use-list-state";
import { usePermission } from "@/hooks/use-permission";
import { isForbiddenError } from "@/lib/api-error";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { SHIPMENT_CREATE_STATUS, SHIPMENT_STATUS, statusMeta } from "@/lib/labels";
import { useShipments, useShipment, useSimulateShipment, type SimulateEvent } from "@/features/shipping/hooks/use-shipments";
import { RemittanceForm } from "@/features/shipping/components/shipments/remittance-form";
import type { ShipmentSummary } from "@/types/shipping";

const DEFAULTS = { status: "" };
const PAGE_SIZE = 15;
const SIMULATION_EVENTS: { value: SimulateEvent; label: string }[] = [
  { value: "picked", label: "Hãng đã lấy hàng" }, { value: "in_transit", label: "Đang vận chuyển" }, { value: "delivering", label: "Đang giao" }, { value: "delivered", label: "Giao thành công" }, { value: "delivery_fail", label: "Giao thất bại" }, { value: "returning", label: "Đang hoàn hàng" }, { value: "returned", label: "Đã trả về shop" }, { value: "cancel", label: "Hãng huỷ trước lấy" }, { value: "lost", label: "Báo thất lạc" },
];

/* Hàng đợi vận chuyển phân trang server; simulator đi cùng handler hãng và luôn được chặn lại ở backend. */
export function ShipmentsScreen({ simulator = false }: { simulator?: boolean }) {
  const state = useListState(DEFAULTS);
  const query = useShipments({ page: state.page, size: PAGE_SIZE, q: state.keyword || undefined, status: state.filters.status || undefined });
  const [selected, setSelected] = useState<string | null>(null);
  const columns: ColumnDef<ShipmentSummary>[] = [
    { accessorKey: "orderCode", header: "Đơn / vận đơn", cell: ({ row }) => <div><Link className="font-mono font-medium hover:underline" href={`${ROUTES.order.orders}/${row.original.orderCode}`}>{row.original.orderCode}</Link><p className="font-mono text-xs text-muted-foreground">{row.original.carrierOrderCode || "Đang chờ mã hãng"}</p></div> },
    { accessorKey: "provider", header: "Hãng", cell: ({ row }) => row.original.provider === "fake" ? "GHN giả lập" : "GHN" },
    { accessorKey: "status", header: "Tiến trình", cell: ({ row }) => { const s = row.original; const m = s.createStatus === "created" ? statusMeta(SHIPMENT_STATUS, s.status || "awaiting_pickup") : statusMeta(SHIPMENT_CREATE_STATUS, s.createStatus); return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>; } },
    { accessorKey: "pickedUpAt", header: "Bàn giao", cell: ({ row }) => row.original.pickedUpAt ? "Hãng đã lấy kiện" : "Chưa lấy kiện" },
    { id: "actions", header: "", cell: ({ row }) => <Button size="sm" variant="outline" onClick={() => setSelected(row.original.id)}>Xem chi tiết</Button> },
  ];
  if (isForbiddenError(query.error)) return <ApiErrorState error={query.error} fallback="Bạn không có quyền xem vận đơn." />;
  return <div className="flex flex-col gap-4">
    <PageHeader title={simulator ? "GHN giả lập" : "Vận chuyển"} description={simulator ? "Chọn vận đơn giả lập và gửi từng sự kiện để kiểm tra toàn bộ hành trình." : "Theo dõi yêu cầu lấy hàng, bàn giao thực tế, giao hàng và khoản COD từ hãng."}><Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCwIcon className="size-4" />Làm mới</Button></PageHeader>
    {simulator ? <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Chỉ thao tác trên vận đơn giả lập. Vận đơn GHN thật được cập nhật từ hãng.</p> : null}
    {query.error ? <ApiErrorState compact error={query.error} fallback="Không tải được vận đơn." /> : null}
    <DataTable columns={columns} data={query.data?.content ?? []} loading={query.isPending} searchValue={state.search} onSearchChange={state.setSearch} searchPlaceholder="Tìm mã đơn hoặc vận đơn…" toolbar={<NativeSelect aria-label="Lọc tiến trình vận chuyển" value={state.filters.status} onChange={(e) => state.setFilter("status", e.target.value)}><option value="">Tất cả tiến trình</option>{Object.entries(SHIPMENT_STATUS).filter(([s]) => !["ready_to_pick", "picking", "delivery_fail", "cancel"].includes(s)).map(([s, m]) => <option key={s} value={s}>{m.label}</option>)}</NativeSelect>} serverPagination={{ pageIndex: state.pageIndex, pageCount: query.data?.totalPages ?? 1, total: query.data?.totalElements ?? 0, pageSize: PAGE_SIZE, onPageChange: state.setPageIndex }} />
    <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Chi tiết vận chuyển</DialogTitle><DialogDescription>Trạng thái lấy và giao hàng theo xác nhận của hãng.</DialogDescription></DialogHeader>{selected ? <ShipmentDetail key={selected} id={selected} simulator={simulator} /> : null}</DialogContent></Dialog>
  </div>;
}

function ShipmentDetail({ id, simulator }: { id: string; simulator: boolean }) {
  const query = useShipment(id);
  const simulate = useSimulateShipment();
  const [event, setEvent] = useState<SimulateEvent>("picked");
  const canSimulate = usePermission(PERMISSIONS.shippingSimulate);
  const canConfirm = usePermission(PERMISSIONS.carrierCodConfirm);
  if (query.error) return <ApiErrorState compact error={query.error} fallback="Không tải được chi tiết vận đơn." />;
  if (!query.data) return <Skeleton className="h-72 w-full rounded-xl" />;
  const shipment = query.data;
  const cod = shipment.codAmount;
  return <div className="space-y-4"><CarrierShipmentCard shipment={shipment} actions={<Button variant="outline" onClick={() => void query.refetch()}>Làm mới chi tiết</Button>} />
    {simulator && canSimulate && shipment.provider === "fake" && shipment.active ? <div className="space-y-3 rounded-xl border p-4"><h3 className="text-sm font-semibold">Sự kiện hãng giả lập</h3><NativeSelect aria-label="Sự kiện vận chuyển" value={event} onChange={(e) => setEvent(e.target.value as SimulateEvent)}>{SIMULATION_EVENTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</NativeSelect><Button disabled={simulate.isPending} onClick={() => simulate.mutate({ shipmentId: id, event })}>{simulate.isPending ? "Đang gửi…" : "Gửi sự kiện"}</Button>{simulate.error ? <ApiErrorState compact error={simulate.error} fallback="Không gửi được sự kiện giả lập." /> : null}</div> : null}
    {canConfirm && shipment.status === "delivered" && Number(cod) > 0 && !shipment.codRemittedAt ? <RemittanceForm shipment={shipment} /> : null}
  </div>;
}
