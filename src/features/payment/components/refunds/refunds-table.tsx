"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { BanknoteIcon, ClipboardCheckIcon, Loader2Icon, TriangleAlertIcon } from "lucide-react";
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
import { PAYMENT_METHOD_LABEL, REFUND_KIND, REFUND_STATUS, statusMeta } from "@/lib/labels";
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
 * "Hoàn tiền": VNPay → gọi API cổng; chuyển khoản / COD → ghi nhận đã chuyển
 * tay kèm mã tham chiếu.
 *
 * Hai tình huống cần người xử lý (backend không tự đoán để không chi tiền hai lần):
 *  - cổng ĐÃ chi mà ghi sổ lỗi (đang xử lý + có mã tham chiếu) → "Ghi sổ lại", không gọi cổng;
 *  - VNPay từng được gọi nhưng không rõ kết quả (`needsReconcile`) → đối chiếu trên cổng rồi chọn đã hoàn / chưa hoàn.
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
      { accessorKey: "method", header: "Kênh hoàn", cell: ({ row }) => PAYMENT_METHOD_LABEL[row.original.method] ?? row.original.method },
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
              {row.original.needsReconcile ? <span className="text-xs text-destructive">Chưa rõ kết quả — cần đối chiếu cổng</span> : null}
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
                  {r.needsReconcile ? <TriangleAlertIcon className="size-3.5" /> : <BanknoteIcon className="size-3.5" />}
                  {r.needsReconcile ? "Đối chiếu" : "Hoàn tiền"}
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

/* Hướng xử lý refund VNPay chưa rõ kết quả: đã hoàn trên cổng ⇒ chỉ ghi sổ; chưa hoàn ⇒ gọi lại cổng. */
const RECONCILE_TABS = [
  { key: "refunded", label: "Cổng ĐÃ hoàn" },
  { key: "not-refunded", label: "Cổng CHƯA hoàn" },
] as const;

function ProcessRefundBody({ refund, onClose }: { refund: RefundResponse; onClose: () => void }) {
  const process = useProcessRefund(refund.id);
  const [providerRef, setProviderRef] = useState("");
  const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState<"refunded" | "not-refunded">("refunded");
  const reconcile = refund.needsReconcile;
  // Hoàn tay (chuyển khoản/COD) hoặc VNPay đã hoàn trên cổng: bắt buộc nhập mã tham chiếu và KHÔNG gọi cổng.
  const needsRef = refund.method !== "vnpay" || (reconcile && outcome === "refunded");
  const duplicate = refund.kind === "duplicate_payment";

  const submit = () =>
    process.mutate(
      {
        providerRef: providerRef.trim() || undefined,
        note: note || undefined,
        ...(reconcile && outcome === "not-refunded" ? { confirmGatewayNotRefunded: true } : {}),
      },
      { onSuccess: onClose },
    );

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {reconcile ? "Đối chiếu hoàn tiền" : "Hoàn tiền"} đơn {refund.orderCode}
        </DialogTitle>
        <DialogDescription>
          {refund.amount.display} qua {PAYMENT_METHOD_LABEL[refund.method] ?? refund.method}.{" "}
          {reconcile
            ? "Lần gọi cổng VNPay trước chưa rõ kết quả. Kiểm tra giao dịch hoàn trên cổng VNPay rồi chọn kết quả — hệ thống không tự gọi lại để tránh hoàn tiền hai lần."
            : refund.method !== "vnpay"
              ? "Chuyển tay cho khách rồi nhập mã tham chiếu."
              : "Hệ thống gọi API hoàn tiền VNPay."}
          {duplicate ? " Đây là khoản khách trả trùng: đơn vẫn giữ trạng thái đã thanh toán." : ""}
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="gap-4">
        {reconcile ? (
          <FilterTabs tabs={RECONCILE_TABS} value={outcome} onChange={(v) => setOutcome(v === "not-refunded" ? "not-refunded" : "refunded")} />
        ) : null}
        {needsRef ? (
          <Field>
            <FieldLabel htmlFor="rf-ref">{reconcile ? "Mã giao dịch hoàn trên cổng VNPay" : "Mã tham chiếu chuyển khoản"}</FieldLabel>
            <Input
              id="rf-ref"
              placeholder={reconcile ? "Mã giao dịch hoàn của VNPay" : "FT26091512345"}
              value={providerRef}
              onChange={(e) => setProviderRef(e.target.value)}
              maxLength={120}
            />
          </Field>
        ) : null}
        {reconcile && outcome === "not-refunded" ? (
          <p className="text-sm text-muted-foreground">Xác nhận bạn đã kiểm tra và VNPay CHƯA hoàn khoản này — hệ thống sẽ gọi lại cổng để hoàn tiền.</p>
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
          {reconcile ? (outcome === "refunded" ? "Ghi sổ (không gọi cổng)" : "Gọi lại cổng hoàn tiền") : "Xác nhận hoàn tiền"}
        </Button>
      </DialogFooter>
    </>
  );
}
