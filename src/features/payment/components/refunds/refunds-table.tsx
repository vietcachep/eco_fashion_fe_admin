"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { BanknoteIcon, ClipboardCheckIcon, Loader2Icon } from "lucide-react";
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
import { REFUND_KIND, REFUND_STATUS, statusMeta, paymentMethodLabel } from "@/lib/labels";
import { useListState } from "@/hooks/use-list-state";
import { useAdminRefunds, useProcessRefund, useRetryFinalizeRefund } from "@/features/payment/hooks/use-payments";
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
 * Hoàn tiền: sinh từ huỷ đơn đã thanh toán, duyệt đổi trả, hoặc khách trả trùng. Kế toán bấm
 * "Hoàn tiền": PayOS → gọi API chi (khi đủ số tài khoản); COD / hoàn tay → ghi nhận đã chuyển
 * tay kèm mã tham chiếu.
 *
 * Tình huống cần người xử lý: cổng ĐÃ chi mà ghi sổ lỗi (đang xử lý + có mã tham chiếu) → "Ghi sổ lại", không gọi cổng.
 */
export function RefundsTable() {
  const { filters, setFilter, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const [processing, setProcessing] = useState<RefundResponse | null>(null);
  const retry = useRetryFinalizeRefund();
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
      { accessorKey: "method", header: "Kênh hoàn", cell: ({ row }) => paymentMethodLabel(row.original.method) },
      {
        accessorKey: "reason",
        header: "Lý do",
        cell: ({ row }) => {
          const kind = statusMeta(REFUND_KIND, row.original.kind);
          return (
            <div className="flex flex-col items-start gap-1">
              {row.original.kind !== "order" ? <StatusBadge tone={kind.tone}>{kind.label}</StatusBadge> : null}
              <span>{row.original.reason ?? "—"}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const m = statusMeta(REFUND_STATUS, row.original.status);
          return (
            <div className="flex flex-col items-start gap-1">
              <StatusBadge tone={m.tone}>{m.label}</StatusBadge>
            </div>
          );
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
        cell: ({ row }) => {
          const r = row.original;
          // Cổng đã chi (có mã tham chiếu) mà chưa ghi sổ xong: chỉ ghi sổ nốt, KHÔNG mở form hoàn tiền (tránh chi lần hai).
          if (r.status === "processing" && r.providerRef) {
            return (
              <PermissionGate permission={PERMISSIONS.refundProcess}>
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" className="h-8" disabled={retry.isPending} onClick={() => retry.mutate(r.id)}>
                    {retry.isPending && retry.variables === r.id ? <Loader2Icon className="size-3.5 animate-spin" /> : <ClipboardCheckIcon className="size-3.5" />}
                    Ghi sổ lại
                  </Button>
                </div>
              </PermissionGate>
            );
          }
          if (r.status !== "requested" && r.status !== "failed") return null;
          return (
            <PermissionGate permission={PERMISSIONS.refundProcess}>
              <div className="flex justify-end">
                <Button size="sm" className="h-8" onClick={() => setProcessing(r)}>
                  <BanknoteIcon className="size-3.5" />
                  Hoàn tiền
                </Button>
              </div>
            </PermissionGate>
          );
        },
      },
    ],
    [retry],
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
  // Hoàn tay (COD / chuyển khoản): bắt buộc nhập mã tham chiếu. PayOS: hệ thống gọi API chi.
  const needsRef = refund.method !== "payos";
  const duplicate = refund.kind === "duplicate_payment";

  const submit = () =>
    process.mutate(
      {
        providerRef: providerRef.trim() || undefined,
        note: note || undefined,
      },
      { onSuccess: onClose },
    );

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          Hoàn tiền đơn {refund.orderCode}
        </DialogTitle>
        <DialogDescription>
          {refund.amount.display} qua {paymentMethodLabel(refund.method)}.{" "}
          {needsRef ? "Chuyển tay cho khách rồi nhập mã tham chiếu." : "Hệ thống gọi API hoàn tiền PayOS."}
          {duplicate ? " Đây là khoản khách trả trùng: đơn vẫn giữ trạng thái đã thanh toán." : ""}
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="gap-4">
        {needsRef ? (
          <Field>
            <FieldLabel htmlFor="rf-ref">Mã tham chiếu chuyển khoản</FieldLabel>
            <Input
              id="rf-ref"
              placeholder="FT26091512345"
              value={providerRef}
              onChange={(e) => setProviderRef(e.target.value)}
              maxLength={120}
            />
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
        <Button disabled={process.isPending || (needsRef && !providerRef.trim())} onClick={submit}>
          {process.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Xác nhận hoàn tiền
        </Button>
      </DialogFooter>
    </>
  );
}
