"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { BanknoteIcon, ClipboardCheckIcon, EyeIcon, HandCoinsIcon, InfoIcon, Loader2Icon, RefreshCwIcon, SearchCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import type { RefundResponse } from "@/lib/api/generated/model";
import { isForbiddenError } from "@/lib/api-error";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { REFUND_KIND, REFUND_METHOD_LABEL, statusMeta } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { ShopFilter } from "@/features/shop/components/platform/shop-filter";
import { useListState } from "@/hooks/use-list-state";
import { RefundPayeeCell, RefundShopCell, RefundStatusCell, isAwaitingGateway } from "@/features/payment/components/refunds/refund-cells";
import { RefundPayeeDialog } from "@/features/payment/components/refunds/refund-payee-dialog";
import { ProcessRefundDialog } from "@/features/payment/components/refunds/refund-process-dialog";
import {
  useAdminRefunds,
  useCheckGatewayRefund,
  useRetryFinalizeRefund,
  useRevealRefundPayee,
} from "@/features/payment/hooks/use-payments";

const TABS = [
  { key: "", label: "Tất cả" },
  { key: "requested", label: "Chờ xử lý" },
  { key: "processing", label: "Đang xử lý" },
  { key: "done", label: "Đã hoàn" },
  { key: "failed", label: "Thất bại" },
] as const;

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được yêu cầu hoàn tiền.";
// `needsManual` = "true" chỉ giữ các khoản đang chờ kế toán chuyển khoản tay (bộ lọc đồng bộ lên URL như các bộ lọc khác).
const DEFAULTS = { status: "", shopId: "", needsManual: "" };

/*
 * Hoàn tiền (kế toán): sinh từ huỷ đơn đã thanh toán, đổi trả được hoàn, hoặc khách trả trùng. Hàng đợi XUYÊN mọi gian hàng, lọc shop
 * và "cần xử lý tay" là tuỳ chọn.
 *
 * Cách chi (backend quyết): ưu tiên tài khoản ĐÃ trả tiền, sau đó tài khoản khách khai → PayOS payout; thiếu tài khoản / chưa cấu hình
 * payout / PayOS treo thì chờ kế toán chuyển khoản tay + nhập mã giao dịch (`needsManual`). PayOS "đã nhận lệnh" KHÔNG phải xong: khoản
 * giữ `processing` ("Đang chờ PayOS xác nhận") cho tới khi PayOS báo thành công — job đối soát tự cập nhật, "Kiểm tra PayOS" hỏi lại ngay.
 *
 * Tình huống cần người xử lý: cổng ĐÃ chi mà ghi sổ lỗi (đang xử lý + có mã tham chiếu) → "Ghi sổ nốt", không gọi cổng; lệnh PayOS không rõ
 * kết quả (`needsReconcile`) → "Đối soát theo lệnh PayOS" trước, KHÔNG chuyển tay ngay (tránh khách nhận hai lần).
 * Hoàn của đơn COD KHÔNG BAO GIỜ tự chi (tiền mặt chưa chắc đã thu) — luôn chờ kế toán duyệt tay.
 */
export function RefundsTable() {
  const { filters, setFilter, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const [processing, setProcessing] = useState<RefundResponse | null>(null);
  const [revealFor, setRevealFor] = useState<RefundResponse | null>(null);
  const retry = useRetryFinalizeRefund();
  const check = useCheckGatewayRefund();
  const reveal = useRevealRefundPayee();
  const { mutate: revealMutate, reset: revealReset } = reveal;
  const { data, isLoading, isError, error } = useAdminRefunds({
    status: filters.status,
    shopId: filters.shopId,
    needsManual: filters.needsManual === "true",
    page,
    size: PAGE_SIZE,
  });

  // Mỗi lần bấm là một lần gọi riêng (backend ghi audit từng lần xem) — không gọi lại khi render.
  const openReveal = useCallback(
    (r: RefundResponse) => {
      setRevealFor(r);
      revealMutate(r.id);
    },
    [revealMutate],
  );
  // Đóng = xoá số tài khoản khỏi bộ nhớ: reset mutation (gcTime 0) rồi bỏ khoản đang xem.
  const closeReveal = () => {
    revealReset();
    setRevealFor(null);
  };

  const columns: ColumnDef<RefundResponse>[] = useMemo(
    () => [
      {
        accessorKey: "orderCode",
        header: "Đơn hàng",
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-0.5 leading-tight">
            <Link href={`${ROUTES.order.orders}/${row.original.orderCode}`} className="font-mono text-sm font-semibold hover:underline">
              {row.original.orderCode}
            </Link>
            {row.original.returnRequestId ? (
              <Link href={`${ROUTES.order.returns}/${row.original.returnRequestId}`} className="text-xs text-primary hover:underline">
                Xem yêu cầu đổi trả
              </Link>
            ) : null}
          </div>
        ),
      },
      // PLAN-0040 6.2: backend trả kèm shopName/shopCode — kế toán không có quyền đọc shop nên không thể tự tra.
      { id: "shop", header: "Gian hàng", cell: ({ row }) => <RefundShopCell refund={row.original} /> },
      { id: "amount", header: "Số tiền", cell: ({ row }) => <span className="font-medium whitespace-nowrap">{row.original.amount.display}</span> },
      // `method` của khoản hoàn là cách chi (gateway | manual_transfer), không phải mã phương thức thanh toán.
      { accessorKey: "method", header: "Cách hoàn", cell: ({ row }) => REFUND_METHOD_LABEL[row.original.method] ?? row.original.method },
      {
        accessorKey: "reason",
        header: "Lý do",
        cell: ({ row }) => {
          const kind = statusMeta(REFUND_KIND, row.original.kind);
          return (
            <div className="flex flex-col items-start gap-1">
              {row.original.kind !== "order" ? <StatusBadge tone={kind.tone}>{kind.label}</StatusBadge> : null}
              <span className="max-w-48 text-sm">{row.original.reason ?? "—"}</span>
            </div>
          );
        },
      },
      {
        id: "payee",
        header: "TK nhận hoàn",
        cell: ({ row }) => {
          const r = row.original;
          return (
            <RefundPayeeCell refund={r}>
              {/* BE chỉ cho xem khi khoản còn mở (đã hoàn xong ⇒ 409) và cần quyền chi hoàn. */}
              {r.payee && r.status !== "done" ? (
                <PermissionGate permission={PERMISSIONS.refundProcess}>
                  <Button type="button" variant="ghost" size="sm" className="-ml-2 h-7 px-2 text-xs" onClick={() => openReveal(r)}>
                    <EyeIcon className="size-3.5" />
                    Xem số TK
                  </Button>
                </PermissionGate>
              ) : null}
            </RefundPayeeCell>
          );
        },
      },
      { accessorKey: "status", header: "Trạng thái", cell: ({ row }) => <RefundStatusCell refund={row.original} /> },
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
                    Ghi sổ nốt
                  </Button>
                </div>
              </PermissionGate>
            );
          }
          // PayOS đã nhận lệnh: KHÔNG gửi lại — chỉ hỏi PayOS kết quả (backend tra `getPayout`); treo bất thường thì cho xác nhận tay bằng mã giao dịch.
          if (isAwaitingGateway(r)) {
            return (
              <PermissionGate permission={PERMISSIONS.refundProcess}>
                <div className="flex flex-col items-end gap-1.5">
                  <Button size="sm" variant="outline" className="h-8" disabled={check.isPending} onClick={() => check.mutate(r.id)}>
                    {check.isPending && check.variables === r.id ? <Loader2Icon className="size-3.5 animate-spin" /> : <RefreshCwIcon className="size-3.5" />}
                    Kiểm tra PayOS
                  </Button>
                  {r.needsManual ? (
                    <Button size="sm" className="h-8" onClick={() => setProcessing(r)}>
                      <HandCoinsIcon className="size-3.5" />
                      Xác nhận tay
                    </Button>
                  ) : null}
                </div>
              </PermissionGate>
            );
          }
          // PLAN-0040 AUD-14: lệnh PayOS không rõ kết quả — đường an toàn là ĐỐI SOÁT theo lệnh đã gửi (xử lý KHÔNG kèm mã), chuyển tay chỉ là lối phụ có chặn 409.
          if (r.needsReconcile && r.status !== "done") {
            return (
              <PermissionGate permission={PERMISSIONS.refundProcess}>
                <div className="flex flex-col items-end gap-1.5">
                  <Button size="sm" className="h-8" disabled={check.isPending} onClick={() => check.mutate(r.id)}>
                    {check.isPending && check.variables === r.id ? <Loader2Icon className="size-3.5 animate-spin" /> : <SearchCheckIcon className="size-3.5" />}
                    Đối soát theo lệnh PayOS
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setProcessing(r)}>
                    <HandCoinsIcon className="size-3.5" />
                    Chuyển tay
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
    [retry, check, openReveal],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterTabs tabs={TABS} value={filters.status} onChange={(v) => setFilter("status", v)} />
          <Button
            type="button"
            variant="outline"
            aria-pressed={filters.needsManual === "true"}
            className={cn("h-8 px-3", filters.needsManual === "true" && "border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200")}
            onClick={() => setFilter("needsManual", filters.needsManual === "true" ? "" : "true")}
          >
            <HandCoinsIcon className="size-3.5" />
            Cần xử lý tay
          </Button>
        </div>
        <ShopFilter value={filters.shopId} onChange={(v) => setFilter("shopId", v)} />
      </div>
      <p className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Hoàn tiền của đơn COD luôn do kế toán duyệt tay (không tự chi). Hoàn nhỏ của đơn thanh toán online được hệ thống tự chi qua PayOS; khoản lớn hơn hạn mức
          tự chi chờ kế toán xử lý.
        </span>
      </p>
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
      <RefundPayeeDialog refund={revealFor} payee={reveal.data} isPending={reveal.isPending} error={reveal.error} onClose={closeReveal} />
    </div>
  );
}
