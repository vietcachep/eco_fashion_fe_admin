"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { BanknoteIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/shared/data-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { isForbiddenError } from "@/lib/api-error";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { PAYMENT_METHOD_LABEL, REFUND_STATUS, statusMeta } from "@/lib/labels";
import { useListState } from "@/hooks/use-list-state";
import { useAdminRefunds, useProcessRefund } from "@/features/payment/hooks/use-payments";
import type { RefundResponse } from "@/features/payment/types/payment";

const TABS = [
  { key: "", label: "Tất cả" },
  { key: "requested", label: "Chờ xử lý" },
  { key: "processing", label: "Đang xử lý" },
  { key: "done", label: "Đã hoàn" },
  { key: "failed", label: "Thất bại" },
] as const;

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được yêu cầu hoàn tiền.";
const DEFAULTS = { status: "" };

/*
 * Hoàn tiền: sinh từ huỷ đơn đã thanh toán hoặc duyệt đổi trả. Kế toán bấm
 * "Hoàn tiền": VNPay → gọi API cổng; chuyển khoản / COD → ghi nhận đã chuyển
 * tay kèm mã tham chiếu.
 */
export function RefundsTable() {
  const { filters, setFilter, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const [processing, setProcessing] = useState<RefundResponse | null>(null);
  const { data, isLoading, isError, error } = useAdminRefunds({ status: filters.status, page, size: PAGE_SIZE });

  const columns: ColumnDef<RefundResponse>[] = useMemo(
    () => [
      {
        accessorKey: "orderCode",
        header: "Đơn hàng",
        cell: ({ row }) => (
          <Link href={`${ROUTES.order.orders}/${row.original.orderCode}`} className="font-mono text-sm font-semibold hover:underline">
            {row.original.orderCode}
          </Link>
        ),
      },
      { id: "amount", header: "Số tiền", cell: ({ row }) => <span className="font-medium">{row.original.amount.display}</span> },
      { accessorKey: "method", header: "Kênh hoàn", cell: ({ row }) => PAYMENT_METHOD_LABEL[row.original.method] ?? row.original.method },
      { accessorKey: "reason", header: "Lý do", cell: ({ row }) => row.original.reason ?? "—" },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const m = statusMeta(REFUND_STATUS, row.original.status);
          return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
        },
      },
      {
        id: "time",
        header: "Thời gian",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDateTime(row.original.createdAt)}
            {row.original.processedAt ? ` → ${formatDateTime(row.original.processedAt)}` : ""}
            {row.original.providerRef ? ` · ${row.original.providerRef}` : ""}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) =>
          row.original.status === "requested" || row.original.status === "failed" ? (
            <PermissionGate permission={PERMISSIONS.refundProcess}>
              <div className="flex justify-end">
                <Button size="sm" className="h-8" onClick={() => setProcessing(row.original)}>
                  <BanknoteIcon className="size-3.5" />
                  Hoàn tiền
                </Button>
              </div>
            </PermissionGate>
          ) : null,
      },
    ],
    [],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-3">
      <FilterTabs tabs={TABS} value={filters.status} onChange={(v) => setFilter("status", v)} />
      {isError ? <ApiErrorState error={error} fallback={LOAD_ERROR} compact /> : null}
      <DataTable
        columns={columns}
        data={data?.content ?? []}
        loading={isLoading}
        serverPagination={{
          pageIndex,
          pageSize: PAGE_SIZE,
          pageCount: data?.totalPages || 1,
          total: data?.totalElements ?? 0,
          onPageChange: setPageIndex,
        }}
      />
      <ProcessRefundDialog refund={processing} onClose={() => setProcessing(null)} />
    </div>
  );
}

function ProcessRefundDialog({ refund, onClose }: { refund: RefundResponse | null; onClose: () => void }) {
  return (
    <Dialog open={!!refund} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {refund ? <ProcessRefundBody key={refund.id} refund={refund} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ProcessRefundBody({ refund, onClose }: { refund: RefundResponse; onClose: () => void }) {
  const process = useProcessRefund(refund.id);
  const [providerRef, setProviderRef] = useState("");
  const [note, setNote] = useState("");
  const manual = refund.method !== "vnpay";

  return (
    <>
      <DialogHeader>
        <DialogTitle>Hoàn tiền đơn {refund.orderCode}</DialogTitle>
        <DialogDescription>
          {refund.amount.display} qua {PAYMENT_METHOD_LABEL[refund.method] ?? refund.method}.{" "}
          {manual ? "Chuyển tay cho khách rồi nhập mã tham chiếu." : "Hệ thống gọi API hoàn tiền VNPay."}
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="gap-4">
        {manual ? (
          <Field>
            <FieldLabel htmlFor="rf-ref">Mã tham chiếu chuyển khoản</FieldLabel>
            <Input id="rf-ref" placeholder="FT26091512345" value={providerRef} onChange={(e) => setProviderRef(e.target.value)} maxLength={120} />
          </Field>
        ) : null}
        <Field>
          <FieldLabel htmlFor="rf-note">Ghi chú</FieldLabel>
          <Input id="rf-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button
          disabled={process.isPending || (manual && !providerRef.trim())}
          onClick={() => process.mutate({ providerRef: providerRef || undefined, note: note || undefined }, { onSuccess: onClose })}
        >
          {process.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Xác nhận hoàn tiền
        </Button>
      </DialogFooter>
    </>
  );
}
