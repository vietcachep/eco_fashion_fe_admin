"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { EyeIcon, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { DataTable } from "@/components/shared/data-table";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { useListState } from "@/hooks/use-list-state";
import { isForbiddenError } from "@/lib/api-error";
import { formatDate, formatNumber, formatVnd } from "@/lib/format";
import { statusMeta, VENDOR_PAYOUT_STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { ShopPayoutResponse } from "@/lib/api/generated/model";
import { useMyShopPayouts } from "@/features/shop/hooks/use-shop-payouts";
import { VendorPayoutDetailSheet } from "@/features/shop/components/vendor/vendor-payout-detail-sheet";

const PAGE_SIZE = 10;
const LOAD_ERROR = "Không tải được các kỳ đối soát.";
const DEFAULTS = { status: "" };
const STATUS_TABS = [
  { key: "", label: "Tất cả" },
  ...(["pending", "processing", "paid", "failed", "carried", "settled"] as const).map((k) => ({ key: k, label: VENDOR_PAYOUT_STATUS[k].label })),
];

/*
 * Các kỳ đối soát của gian hàng CHÍNH MÌNH (GET /shop/payouts) — chỉ xem; sàn mới chạy kỳ / chi tiền. Bấm "Chi tiết"
 * mở Sheet với các dòng đơn bán / hoàn tiền của kỳ (GET /shop/payouts/:id). Trạng thái lọc đồng bộ URL (?status=).
 */
export function VendorPayoutsTable() {
  const { filters, setFilter, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const { data, isLoading, isError, error } = useMyShopPayouts({ page, size: PAGE_SIZE, status: filters.status });
  const [detailId, setDetailId] = useState<string | null>(null);

  const columns: ColumnDef<ShopPayoutResponse>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: "Mã kỳ",
        cell: ({ row }) => (
          <button type="button" onClick={() => setDetailId(row.original.id)} className="font-mono text-sm font-semibold hover:underline">
            {row.original.code}
          </button>
        ),
      },
      {
        id: "period",
        header: "Kỳ đối soát",
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {formatDate(row.original.periodStart)} → {formatDate(row.original.periodEnd)}
          </span>
        ),
      },
      { id: "gross", header: "Doanh thu", cell: ({ row }) => <span className="tabular-nums">{formatVnd(row.original.grossRevenue)}</span> },
      { id: "commission", header: "Hoa hồng", cell: ({ row }) => <span className="tabular-nums">{formatVnd(row.original.commission)}</span> },
      { id: "refund", header: "Hoàn tiền", cell: ({ row }) => <span className="tabular-nums">{formatVnd(row.original.refundAmount)}</span> },
      { id: "debt", header: "Nợ kỳ trước", cell: ({ row }) => <span className="tabular-nums">{formatVnd(row.original.carriedDebt)}</span> },
      {
        id: "net",
        header: "Thực nhận",
        cell: ({ row }) => {
          const net = Number(row.original.netPayout);
          return <span className={cn("font-semibold whitespace-nowrap tabular-nums", net < 0 && "text-destructive")}>{formatVnd(net)}</span>;
        },
      },
      {
        id: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const meta = statusMeta(VENDOR_PAYOUT_STATUS, row.original.status);
          return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
        },
      },
      {
        id: "bank",
        header: "TK nhận",
        cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.bankAccountMasked ?? "—"}</span>,
      },
      {
        id: "paidAt",
        header: "Ngày chi",
        cell: ({ row }) => <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDate(row.original.paidAt)}</span>,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="h-8" onClick={() => setDetailId(row.original.id)}>
              <EyeIcon className="size-3.5" />
              Chi tiết
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
      <PayoutRulesNote />
      <FilterTabs tabs={STATUS_TABS} value={filters.status} onChange={(v) => setFilter("status", v)} />
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
      <p className="text-xs text-muted-foreground">{formatNumber(data?.totalElements)} kỳ đối soát khớp bộ lọc.</p>
      <VendorPayoutDetailSheet payoutId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

/* Quy tắc đối soát rút gọn — vendor hay thắc mắc "sao đơn này chưa có trong kỳ / sao thực nhận ít hơn doanh thu". */
function PayoutRulesNote() {
  return (
    <Card size="sm">
      <CardContent className="flex items-start gap-3">
        <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-muted-foreground">
          <li>
            Sàn <b className="text-foreground">tự động đối soát và chi trả mỗi ngày</b>. Cả đơn <b className="text-foreground">online (PayOS) lẫn COD</b> đã qua hạn đổi trả đều vào kỳ đối soát (sàn thu tiền COD từ đơn vị vận chuyển).
          </li>
          <li>
            Thực nhận = Doanh thu − Hoa hồng sàn − Hoàn tiền cho khách − Nợ kỳ trước. Voucher do sàn tài trợ do sàn chịu (đã cộng vào doanh thu của bạn).
          </li>
          <li>Kỳ có thực nhận âm sẽ không chi tiền: khoản nợ được mang sang và trừ vào kỳ sau.</li>
        </ul>
      </CardContent>
    </Card>
  );
}
