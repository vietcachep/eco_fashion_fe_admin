"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { DataTable } from "@/components/shared/data-table";
import { DetailList, type DetailRow } from "@/components/shared/detail-list";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError } from "@/lib/api-error";
import { formatDateTime, formatNumber, formatVnd } from "@/lib/format";
import { statusMeta, TOPUP_STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { useAdminTopup, useAdminTopups } from "@/features/shop/hooks/use-wallet-topups";
import type { WalletTopup, WalletTopupReceipt } from "@/features/shop/types/wallet-topup";

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được danh sách nạp qua PayOS.";
const DETAIL_ERROR = "Không tải được chi tiết khoản nạp.";
const TOPUP_TABS = [
  { key: "", label: "Tất cả" },
  { key: "pending", label: "Chờ thanh toán" },
  { key: "partial", label: "Một phần" },
  { key: "paid", label: "Đã nhận đủ" },
  { key: "expired", label: "Hết hạn" },
  { key: "cancelled", label: "Đã huỷ" },
  { key: "failed", label: "Không tạo được" },
] as const;

/*
 * Tông cột "Đã nhận" (PLAN-0041 §8.3): đủ hoặc thừa thì xanh, mới nhận một phần thì cam, chưa nhận đồng nào thì trung tính.
 * So sánh bằng Number vì tiền VND là số nguyên ≤ 14 chữ số (an toàn trong Number); chỉ so sánh, không cộng trừ tiền ở FE.
 */
function receivedToneClass(t: WalletTopup): string {
  const got = Number(t.receivedAmount);
  if (!(got > 0)) return "text-muted-foreground";
  return got >= Number(t.amount) ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-300";
}

/*
 * Khoản nạp cọc qua PayOS của mọi gian hàng — CHỈ XEM (PLAN-0041 §8.3). Ví đã được ghi có tự động khi PayOS xác nhận,
 * nên ở đây KHÔNG có nút duyệt / từ chối / sửa; kế toán đối chiếu bằng mã PayOS với bảng điều khiển PayOS.
 */
export function WalletTopupsTab() {
  const [status, setStatus] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const { data, isLoading, isError, error } = useAdminTopups({ status, page: pageIndex + 1, size: PAGE_SIZE });
  const [detailOf, setDetailOf] = useState<WalletTopup | null>(null);

  const columns: ColumnDef<WalletTopup>[] = useMemo(
    () => [
      { id: "at", header: "Tạo lúc", cell: ({ row }) => <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(row.original.createdAt)}</span> },
      { id: "shop", header: "Gian hàng", cell: ({ row }) => <span className="font-medium">{row.original.shopName ?? `Shop …${row.original.shopId.slice(0, 8)}`}</span> },
      { id: "amount", header: "Yêu cầu", cell: ({ row }) => <span className="font-semibold tabular-nums">{formatVnd(row.original.amount)}</span> },
      {
        id: "received",
        header: "Đã nhận",
        cell: ({ row }) => <span className={cn("font-semibold tabular-nums", receivedToneClass(row.original))}>{formatVnd(row.original.receivedAmount)}</span>,
      },
      {
        id: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const m = statusMeta(TOPUP_STATUS, row.original.status);
          // Link đã đóng mà vẫn có tiền về: nêu rõ số đã vào ví, để kế toán không đọc nhầm là "chưa nhận đồng nào".
          const closedWithMoney =
            (row.original.status === "expired" || row.original.status === "cancelled") && Number(row.original.receivedAmount) > 0;
          return (
            <div className="flex flex-col gap-0.5">
              <StatusBadge tone={m.tone}>{m.label}</StatusBadge>
              {closedWithMoney ? (
                <span className="text-xs text-muted-foreground">
                  đã ghi có {formatVnd(row.original.receivedAmount)} / {formatVnd(row.original.amount)}
                </span>
              ) : null}
            </div>
          );
        },
      },
      { id: "code", header: "Mã PayOS", cell: ({ row }) => <span className="font-mono text-xs">{row.original.payosOrderCode}</span> },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" className="h-8" onClick={() => setDetailOf(row.original)}>
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
      <FilterTabs
        tabs={TOPUP_TABS}
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPageIndex(0);
        }}
      />
      {isError ? <ApiErrorState error={error} fallback={LOAD_ERROR} compact /> : null}
      <DataTable
        columns={columns}
        data={data?.content ?? []}
        loading={isLoading}
        serverPagination={{ pageIndex, pageSize: PAGE_SIZE, pageCount: data?.totalPages || 1, total: data?.totalElements ?? 0, onPageChange: setPageIndex }}
      />
      <p className="text-xs text-muted-foreground">
        {formatNumber(data?.totalElements)} khoản nạp khớp bộ lọc. Ví được ghi có tự động khi PayOS xác nhận; sàn chỉ đối chiếu, không duyệt tay.
      </p>
      {detailOf ? <TopupDetailDialog key={detailOf.id} topup={detailOf} onClose={() => setDetailOf(null)} /> : null}
    </div>
  );
}

const RECEIPT_COLUMNS: ColumnDef<WalletTopupReceipt>[] = [
  { id: "reference", header: "Mã giao dịch", cell: ({ row }) => <span className="font-mono text-xs break-all">{row.original.reference}</span> },
  { id: "amount", header: "Số tiền", cell: ({ row }) => <span className="font-semibold tabular-nums">{formatVnd(row.original.amount)}</span> },
  { id: "at", header: "Thời gian", cell: ({ row }) => <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(row.original.createdAt)}</span> },
];

/*
 * Chi tiết một khoản nạp: số liệu tổng và các lần tiền PayOS báo về (mã giao dịch để đối chiếu). Tách thành component con
 * có key theo khoản để mỗi lần mở là một lần tải riêng, không giữ dữ liệu của khoản trước.
 */
function TopupDetailDialog({ topup, onClose }: { topup: WalletTopup; onClose: () => void }) {
  const detail = useAdminTopup(topup.id);
  // Có chi tiết thì dùng số liệu của nó (mới hơn dòng bảng); chưa về thì hiện số liệu của dòng vừa bấm để hộp thoại không trống.
  const shown: WalletTopup = detail.data ?? topup;
  const shop = shown.shopName ?? `Shop …${shown.shopId.slice(0, 8)}`;
  const m = statusMeta(TOPUP_STATUS, shown.status);
  const rows: DetailRow[] = [
    { label: "Gian hàng", value: shop },
    { label: "Yêu cầu", value: formatVnd(shown.amount) },
    { label: "Đã nhận", value: <span className={cn("font-semibold tabular-nums", receivedToneClass(shown))}>{formatVnd(shown.receivedAmount)}</span> },
    { label: "Trạng thái", value: <StatusBadge tone={m.tone}>{m.label}</StatusBadge> },
    { label: "Mã PayOS", value: <span className="font-mono text-xs">{shown.payosOrderCode}</span> },
    { label: "Tạo lúc", value: formatDateTime(shown.createdAt) },
    { label: "Hạn link", value: formatDateTime(shown.expiresAt) },
    { label: "Nhận đủ lúc", value: formatDateTime(shown.paidAt) },
    { label: "Đóng link lúc", value: formatDateTime(shown.closedAt) },
    {
      // Trạng thái PayOS giữ nguyên mã gốc (PAID, UNDERPAID, …) để khớp với bảng điều khiển PayOS khi đối chiếu.
      label: "Trạng thái PayOS lần cuối",
      value: detail.isPending ? (
        <Skeleton className="h-4 w-24" />
      ) : (
        <span className="font-mono text-xs">{detail.data?.lastGatewayStatus ?? "—"}</span>
      ),
    },
    {
      label: "Đối chiếu PayOS lần cuối",
      value: detail.isPending ? <Skeleton className="h-4 w-32" /> : formatDateTime(detail.data?.lastCheckedAt),
    },
  ];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Khoản nạp qua PayOS</DialogTitle>
          <DialogDescription>
            {shop} · mã PayOS {shown.payosOrderCode}
          </DialogDescription>
        </DialogHeader>
        <DetailList rows={rows} />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Khoản tiền PayOS báo về</p>
          <p className="text-xs text-muted-foreground">Mỗi dòng là một lần chuyển khớp link. Đối chiếu mã giao dịch với bảng điều khiển PayOS trước khi kết luận.</p>
          {detail.isError ? <ApiErrorState error={detail.error} fallback={DETAIL_ERROR} compact /> : null}
          <DataTable columns={RECEIPT_COLUMNS} data={detail.data?.receipts ?? []} loading={detail.isPending} pageSize={5} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
