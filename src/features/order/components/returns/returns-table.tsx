"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { EyeIcon, GavelIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import type { ReturnRequestResponse } from "@/lib/api/generated/model";
import { isForbiddenError } from "@/lib/api-error";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { RETURN_DEADLINE_LABEL, RETURN_ESCALATE_SOURCE_SHORT, RETURN_REASON_LABEL } from "@/lib/labels";
import { useListState } from "@/hooks/use-list-state";
import { usePermission } from "@/hooks/use-permission";
import { ShopFilter } from "@/features/shop/components/platform/shop-filter";
import { ReturnDeadline } from "@/features/order/components/returns-common/return-deadline";
import { useNow } from "@/features/order/hooks/use-now";
import { useAdminReturns } from "@/features/order/hooks/use-returns";
import { ADMIN_RETURN_ALL, ADMIN_RETURN_DEFAULT_STATUS, ADMIN_RETURN_TABS, returnItemSummary, returnStatusMeta } from "@/features/order/types/return";

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được yêu cầu đổi trả.";
// Mặc định là hàng đợi của CSKH: các ca chờ sàn phân xử. Bộ lọc đồng bộ lên URL nên link từ dashboard (?status=escalated) khớp luôn.
const DEFAULTS = { status: ADMIN_RETURN_DEFAULT_STATUS, shopId: "" };

/*
 * Yêu cầu đổi trả — cổng SÀN. Shop là bên duyệt / từ chối / nhận hàng; màn này là HÀNG ĐỢI PHÂN XỬ cho CSKH: mặc định lọc `escalated`
 * (khách khiếu nại · shop quá hạn · shop báo hàng không khớp), xuyên mọi gian hàng, lọc theo shop là tuỳ chọn. Các tab khác chỉ để
 * theo dõi — yêu cầu chưa chuyển sàn do shop đang xử lý nên không có nút phân xử.
 */
export function ReturnsTable() {
  const { filters, setFilter, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const status = filters.status === ADMIN_RETURN_ALL ? "" : filters.status;
  const { data, isLoading, isError, error } = useAdminReturns({ status, shopId: filters.shopId, page, size: PAGE_SIZE });
  const canProcess = usePermission(PERMISSIONS.returnProcess);
  const now = useNow();

  const columns: ColumnDef<ReturnRequestResponse>[] = useMemo(
    () => [
      {
        accessorKey: "orderCode",
        header: "Đơn hàng",
        cell: ({ row }) => (
          <div className="min-w-0 leading-tight">
            <Link href={`${ROUTES.order.orders}/${row.original.orderCode}`} className="font-mono text-sm font-semibold hover:underline">
              {row.original.orderCode}
            </Link>
            <p className="max-w-56 truncate text-xs text-muted-foreground">{returnItemSummary(row.original)}</p>
          </div>
        ),
      },
      {
        id: "shop",
        header: "Gian hàng",
        cell: ({ row }) => (
          <button
            type="button"
            className="max-w-40 truncate text-left text-sm hover:underline"
            title={`Chỉ xem yêu cầu của ${row.original.shopName}`}
            onClick={() => setFilter("shopId", row.original.shopId)}
          >
            {row.original.shopName}
          </button>
        ),
      },
      {
        id: "reason",
        header: "Lý do",
        cell: ({ row }) => <span className="text-sm">{RETURN_REASON_LABEL[row.original.reasonCode] ?? row.original.reasonCode}</span>,
      },
      {
        id: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const m = returnStatusMeta(row.original);
          return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
        },
      },
      {
        // Vì sao yêu cầu lên sàn — CSKH nhìn là biết ai cần giải trình (khách khiếu nại / shop quá hạn / hàng không khớp).
        id: "escalateSource",
        header: "Nguồn chuyển sàn",
        cell: ({ row }) => {
          const source = row.original.escalateSource;
          return source ? <span className="text-sm">{RETURN_ESCALATE_SOURCE_SHORT[source] ?? source}</span> : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        id: "deadline",
        header: "Hạn",
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex flex-col items-start gap-0.5">
              <ReturnDeadline deadlineAt={r.deadlineAt} deadlineKind={r.deadlineKind} now={now} compact />
              {r.deadlineAt && r.deadlineKind ? <span className="text-xs text-muted-foreground">{RETURN_DEADLINE_LABEL[r.deadlineKind]}</span> : null}
            </div>
          );
        },
      },
      {
        id: "refund",
        header: "Hoàn tiền",
        cell: ({ row }) =>
          row.original.codReversed ? <span className="text-sm text-muted-foreground">Đảo ghi thu COD</span> : <span className="font-medium">{row.original.refundAmount.display}</span>,
      },
      {
        accessorKey: "createdAt",
        header: "Gửi lúc",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => {
          const adjudicate = canProcess && row.original.status === "escalated";
          return (
            <div className="flex justify-end">
              <Button
                variant={adjudicate ? "default" : "outline"}
                size="sm"
                nativeButton={false}
                className="h-8"
                render={<Link href={`${ROUTES.order.returns}/${row.original.id}`} />}
              >
                {adjudicate ? <GavelIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
                {adjudicate ? "Phân xử" : "Xem"}
              </Button>
            </div>
          );
        },
      },
    ],
    [canProcess, now, setFilter],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterTabs tabs={ADMIN_RETURN_TABS} value={filters.status} onChange={(v) => setFilter("status", v)} />
        <ShopFilter value={filters.shopId} onChange={(v) => setFilter("shopId", v)} />
      </div>
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
    </div>
  );
}
