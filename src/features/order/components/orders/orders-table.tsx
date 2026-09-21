"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { EyeIcon, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { NativeSelect } from "@/components/shared/native-select";
import { StatusBadge } from "@/components/shared/status-badge";
import { isForbiddenError } from "@/lib/api-error";
import { ROUTES } from "@/lib/constants";
import { formatDateTime, formatNumber } from "@/lib/format";
import { ORDER_PAYMENT_STATUS, ORDER_STATUS, PAYMENT_METHOD_LABEL, statusMeta } from "@/lib/labels";
import { useListState } from "@/hooks/use-list-state";
import { useAdminOrders } from "@/features/order/hooks/use-orders";
import type { OrderSummaryResponse } from "@/features/order/types/order";

const STATUS_TABS = [
  { key: "", label: "Tất cả" },
  { key: "pending", label: "Chờ xác nhận" },
  { key: "confirmed", label: "Đã xác nhận" },
  { key: "packing", label: "Đóng gói" },
  { key: "shipping", label: "Đang giao" },
  { key: "delivered", label: "Đã giao" },
  { key: "completed", label: "Hoàn tất" },
  { key: "cancelled", label: "Đã huỷ" },
  { key: "returned", label: "Trả hàng" },
] as const;

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được danh sách đơn.";
const DEFAULTS = { status: "", paymentStatus: "", paymentMethodCode: "" };

/* Danh sách đơn: lọc trạng thái đơn / thanh toán / phương thức, tìm mã đơn / tên / SĐT. */
export function OrdersTable() {
  const { filters, setFilter, search, setSearch, keyword, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const { data, isLoading, isError, error } = useAdminOrders({
    keyword,
    status: filters.status,
    paymentStatus: filters.paymentStatus,
    paymentMethodCode: filters.paymentMethodCode,
    page,
    size: PAGE_SIZE,
  });

  const columns: ColumnDef<OrderSummaryResponse>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: "Đơn hàng",
        cell: ({ row }) => {
          const o = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
                {o.firstItemImage ? (
                  // eslint-disable-next-line @next/next/no-img-element -- ảnh động
                  <img src={o.firstItemImage} alt="" className="size-full object-cover" />
                ) : (
                  <ImageIcon className="size-4 text-muted-foreground/60" />
                )}
              </div>
              <div className="min-w-0 leading-tight">
                <Link href={`${ROUTES.order.orders}/${o.code}`} className="font-mono text-sm font-semibold hover:underline">
                  {o.code}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {o.firstItemName ?? ""}
                  {o.itemCount > 1 ? ` +${o.itemCount - 1}` : ""}
                </p>
              </div>
            </div>
          );
        },
      },
      { accessorKey: "recipientName", header: "Người nhận" },
      { id: "total", header: "Tổng tiền", cell: ({ row }) => <span className="font-medium">{row.original.total.display}</span> },
      {
        id: "payment",
        header: "Thanh toán",
        cell: ({ row }) => {
          const m = statusMeta(ORDER_PAYMENT_STATUS, row.original.paymentStatus);
          return (
            <div className="flex flex-col gap-0.5">
              <StatusBadge tone={m.tone}>{m.label}</StatusBadge>
              <span className="text-xs text-muted-foreground">{PAYMENT_METHOD_LABEL[row.original.paymentMethodCode] ?? row.original.paymentMethodCode}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const m = statusMeta(ORDER_STATUS, row.original.status);
          return <StatusBadge tone={m.tone}>{row.original.statusLabel || m.label}</StatusBadge>;
        },
      },
      {
        accessorKey: "createdAt",
        header: "Đặt lúc",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" nativeButton={false} className="h-8" render={<Link href={`${ROUTES.order.orders}/${row.original.code}`} />}>
              <EyeIcon className="size-3.5" />
              Xử lý
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <FilterTabs tabs={STATUS_TABS} value={filters.status} onChange={(v) => setFilter("status", v)} />
        <NativeSelect aria-label="Thanh toán" className="w-40" value={filters.paymentStatus} onChange={(e) => setFilter("paymentStatus", e.target.value)}>
          <option value="">Mọi thanh toán</option>
          {Object.entries(ORDER_PAYMENT_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Phương thức" className="w-40" value={filters.paymentMethodCode} onChange={(e) => setFilter("paymentMethodCode", e.target.value)}>
          <option value="">Mọi phương thức</option>
          {["cod", "bank_transfer", "vnpay"].map((k) => (
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
        searchPlaceholder="Mã đơn / tên / SĐT người nhận…"
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
      <p className="text-xs text-muted-foreground">{formatNumber(data?.totalElements)} đơn khớp bộ lọc.</p>
    </div>
  );
}
