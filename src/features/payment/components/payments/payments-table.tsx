"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { NativeSelect } from "@/components/shared/native-select";
import { StatusBadge } from "@/components/shared/status-badge";
import { isForbiddenError } from "@/lib/api-error";
import { ROUTES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS, statusMeta, paymentMethodLabel } from "@/lib/labels";
import { useListState } from "@/hooks/use-list-state";
import { useAdminPayments } from "@/features/payment/hooks/use-payments";
import type { PaymentResponse } from "@/features/payment/types/payment";

const TABS = [
  { key: "", label: "Tất cả" },
  { key: "pending", label: "Chờ thanh toán" },
  { key: "paid", label: "Đã thanh toán" },
  { key: "failed", label: "Thất bại" },
  { key: "expired", label: "Hết hạn" },
  { key: "refunded", label: "Đã hoàn" },
] as const;

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được giao dịch.";
const DEFAULTS = { status: "", methodCode: "" };

/* Giao dịch thanh toán (COD · PayOS; dòng cũ vnpay / chuyển khoản hiện nhãn chung). */
export function PaymentsTable() {
  const { filters, setFilter, search, setSearch, keyword, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const { data, isLoading, isError, error } = useAdminPayments({
    keyword,
    status: filters.status,
    methodCode: filters.methodCode,
    page,
    size: PAGE_SIZE,
  });

  const columns: ColumnDef<PaymentResponse>[] = useMemo(
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
      { id: "method", header: "Phương thức", cell: ({ row }) => paymentMethodLabel(row.original.methodCode) },
      {
        id: "amount",
        header: "Số tiền",
        cell: ({ row }) => (
          <div className="leading-tight">
            <p className="font-medium">{row.original.amount.display}</p>
            {Number(row.original.refundedAmount.amount) > 0 ? (
              <p className="text-xs text-muted-foreground">hoàn {row.original.refundedAmount.display}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: "ref",
        header: "Tham chiếu",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <span className="font-mono text-xs text-muted-foreground">
              {p.transactionCode ?? "—"}
              {p.cardBrand ? ` · ${p.cardBrand} ${p.cardLast4 ?? ""}` : ""}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const m = statusMeta(PAYMENT_STATUS, row.original.status);
          return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
        },
      },
      {
        id: "time",
        header: "Thời gian",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.paidAt ? `TT ${formatDateTime(row.original.paidAt)}` : `Tạo ${formatDateTime(row.original.createdAt)}`}
          </span>
        ),
      },
    ],
    [],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <FilterTabs tabs={TABS} value={filters.status} onChange={(v) => setFilter("status", v)} />
        <NativeSelect aria-label="Phương thức" className="w-40" value={filters.methodCode} onChange={(e) => setFilter("methodCode", e.target.value)}>
          <option value="">Mọi phương thức</option>
          {["cod", "payos"].map((k) => (
            <option key={k} value={k}>
              {PAYMENT_METHOD_LABEL[k]}
            </option>
          ))}
        </NativeSelect>
      </div>
      {isError ? <ApiErrorState error={error} fallback={LOAD_ERROR} compact /> : null}
      <DataTable
        columns={columns}
        data={data?.content ?? []}
        loading={isLoading}
        searchPlaceholder="Mã đơn / mã giao dịch…"
        searchValue={search}
        onSearchChange={setSearch}
        serverPagination={{
          pageIndex,
          pageSize: PAGE_SIZE,
          pageCount: data?.totalPages || 1,
          total: data?.totalElements ?? 0,
          onPageChange: setPageIndex,
        }}
      />
    </div>
  );
}
