"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { BellRingIcon, ChevronLeftIcon, ChevronRightIcon, ImageIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { DataTable } from "@/components/shared/data-table";
import { FilterTabs, type FilterTab } from "@/components/shared/filter-tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { isForbiddenError } from "@/lib/api-error";
import { ROUTES } from "@/lib/constants";
import { formatDateTime, formatNumber } from "@/lib/format";
import { ORDER_STATUS, statusMeta } from "@/lib/labels";
import { useListState } from "@/hooks/use-list-state";
import { useShopAwaitingConfirmCount, useShopOrders, useShopOrderSummary } from "@/features/order/hooks/use-shop-orders";
import type { OrderSummaryResponse } from "@/features/order/types/order";
import { isActionablePending, isAwaitingOnlinePayment, SHOP_ORDER_STATUS_TABS } from "@/features/order/types/shop-order";
import { ShopPaymentBadge } from "@/features/order/components/vendor/shop-payment-badge";

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được danh sách đơn hàng.";
const DEFAULTS = { status: "" };

const detailHref = (code: string) => `${ROUTES.vendor.orders}/${code}`;

function OrderThumb({ url }: { url: string | null }) {
  return (
    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- ảnh động
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <ImageIcon className="size-4 text-muted-foreground/60" />
      )}
    </div>
  );
}

function itemSummary(o: OrderSummaryResponse): string {
  return `${o.firstItemName ?? "—"}${o.itemCount > 1 ? ` +${o.itemCount - 1} sản phẩm khác` : ""}`;
}

/* Gợi ý cho đơn chờ xác nhận: đơn đã trả/COD shop làm được ngay, đơn online chưa trả phải chờ khách. */
function UrgencyChip({ order }: { order: OrderSummaryResponse }) {
  if (isActionablePending(order)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
        <BellRingIcon className="size-3" />
        Cần xử lý ngay
      </span>
    );
  }
  if (isAwaitingOnlinePayment(order)) {
    return <span className="text-xs text-muted-foreground">Chờ khách thanh toán</span>;
  }
  return null;
}

/* Thẻ đơn cho màn hẹp (< md): cả thẻ là link tới chi tiết. */
function OrderCard({ order: o }: { order: OrderSummaryResponse }) {
  const status = statusMeta(ORDER_STATUS, o.status);
  return (
    <Link href={detailHref(o.code)} className="flex flex-col gap-2.5 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/50">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-sm font-semibold">{o.code}</span>
        <StatusBadge tone={status.tone}>{o.statusLabel || status.label}</StatusBadge>
      </div>
      <div className="flex items-center gap-3">
        <OrderThumb url={o.firstItemImage} />
        <p className="min-w-0 text-sm leading-snug">
          <span className="line-clamp-2">{itemSummary(o)}</span>
        </p>
      </div>
      <div className="flex items-end justify-between gap-2 text-sm">
        <div className="min-w-0">
          <p className="truncate font-medium">{o.recipientName}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</p>
        </div>
        <p className="shrink-0 font-semibold">{o.total.display}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <ShopPaymentBadge method={o.paymentMethodCode} status={o.paymentStatus} />
        <UrgencyChip order={o} />
      </div>
    </Link>
  );
}

function OrderCardsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2.5 rounded-xl border p-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-md" />
            <Skeleton className="h-4 flex-1 rounded" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/*
 * Danh sách đơn con của shop — tab trạng thái kèm số đơn (GET /shop/orders/summary),
 * tìm mã đơn / tên / SĐT người nhận. Backend chỉ lọc theo trạng thái + từ khoá
 * (không lọc theo phương thức thanh toán) nên màn không có bộ lọc đó; thanh toán
 * hiện thành badge từng dòng. Bảng ở ≥ md, thẻ ở màn hẹp.
 */
export function VendorOrdersTable() {
  const { filters, setFilter, search, setSearch, keyword, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const { data, isLoading, isError, error } = useShopOrders({ keyword, status: filters.status, page, size: PAGE_SIZE });
  const summary = useShopOrderSummary();
  const awaiting = useShopAwaitingConfirmCount();

  const tabs: FilterTab[] = useMemo(() => {
    const counts = summary.data;
    return [
      { key: "", label: "Tất cả", count: counts ? Object.values(counts).reduce((a, b) => a + b, 0) : undefined },
      ...SHOP_ORDER_STATUS_TABS.map((k) => ({ key: k, label: ORDER_STATUS[k].label, count: counts?.[k] })),
    ];
  }, [summary.data]);

  const columns: ColumnDef<OrderSummaryResponse>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: "Đơn hàng",
        cell: ({ row }) => {
          const o = row.original;
          return (
            <div className="flex items-center gap-3">
              <OrderThumb url={o.firstItemImage} />
              <div className="min-w-0 leading-tight">
                <Link href={detailHref(o.code)} className="font-mono text-sm font-semibold hover:underline">
                  {o.code}
                </Link>
                <p className="max-w-56 truncate text-xs text-muted-foreground">{itemSummary(o)}</p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Ngày đặt",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>,
      },
      { accessorKey: "recipientName", header: "Người nhận" },
      {
        accessorKey: "itemCount",
        header: "Số SP",
        cell: ({ row }) => formatNumber(row.original.itemCount),
      },
      {
        id: "total",
        header: "Tổng tiền",
        cell: ({ row }) => <span className="font-medium">{row.original.total.display}</span>,
      },
      {
        id: "payment",
        header: "Thanh toán",
        cell: ({ row }) => <ShopPaymentBadge method={row.original.paymentMethodCode} status={row.original.paymentStatus} />,
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const o = row.original;
          const m = statusMeta(ORDER_STATUS, o.status);
          return (
            <div className="flex flex-col items-start gap-1">
              <StatusBadge tone={m.tone}>{o.statusLabel || m.label}</StatusBadge>
              <UrgencyChip order={o} />
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={detailHref(row.original.code)} />}>
              Chi tiết
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  const rows = data?.content ?? [];
  const pageCount = data?.totalPages || 1;
  const awaitingCount = awaiting.data ?? 0;

  return (
    <div className="flex flex-col gap-3">
      {awaitingCount > 0 ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <p className="flex items-center gap-2">
            <BellRingIcon className="size-4 shrink-0" />
            <span>
              <b>{formatNumber(awaitingCount)} đơn cần xử lý ngay</b> — đơn COD hoặc đã thanh toán, đang chờ shop xác nhận.
            </span>
          </p>
          {filters.status !== "pending" ? (
            <Button size="sm" variant="outline" onClick={() => setFilter("status", "pending")}>
              Xem đơn chờ xác nhận
            </Button>
          ) : null}
        </div>
      ) : null}

      <FilterTabs tabs={tabs} value={filters.status} onChange={(v) => setFilter("status", v)} />

      <div className="relative w-full sm:max-w-xs">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Tìm đơn hàng"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mã đơn / tên / SĐT người nhận…"
          className="h-9 rounded-lg pl-9"
        />
      </div>

      {isError ? <ApiErrorState error={error} fallback={LOAD_ERROR} compact /> : null}

      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={rows}
          loading={isLoading}
          serverPagination={{
            pageIndex,
            pageSize: PAGE_SIZE,
            pageCount,
            total: data?.totalElements ?? 0,
            onPageChange: setPageIndex,
          }}
        />
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {isLoading ? (
          <OrderCardsSkeleton />
        ) : rows.length ? (
          rows.map((o) => <OrderCard key={o.code} order={o} />)
        ) : (
          <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">Không có đơn hàng nào.</p>
        )}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Trang {pageIndex + 1} / {pageCount}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="size-8" aria-label="Trang trước" disabled={pageIndex <= 0} onClick={() => setPageIndex(pageIndex - 1)}>
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              aria-label="Trang sau"
              disabled={pageIndex >= pageCount - 1}
              onClick={() => setPageIndex(pageIndex + 1)}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{formatNumber(data?.totalElements)} đơn khớp bộ lọc.</p>
    </div>
  );
}
