"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCheckIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { DetailList } from "@/components/shared/detail-list";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { PERMISSIONS } from "@/lib/constants";
import { formatDateTime, formatVnd } from "@/lib/format";
import type { ShopPayoutLineResponse, ShopPayoutResponse } from "@/lib/api/generated/model";
import { MarkPaidDialog } from "@/features/shop/components/platform/mark-paid-dialog";
import { NetPayoutAmount, PayoutPeriod, PayoutStatusBadge } from "@/features/shop/components/platform/payout-cells";
import { useAdminPayoutDetail, usePayosBalance, useRetryPayout } from "@/features/shop/hooks/use-admin-payouts";

/* Backend cho gửi lại kỳ `processing` chỉ khi treo quá 10 phút (STUCK_PROCESSING_MS). */
const STUCK_PROCESSING_MS = 10 * 60_000;
const LOAD_ERROR = "Không tải được chi tiết kỳ đối soát.";

/*
 * Hành động khả dụng theo trạng thái kỳ (khớp `retry` / `markPaid` của backend):
 *   - Gửi lại lệnh chi: PayOS ĐÃ cấu hình và kỳ failed / pending / processing treo > 10 phút.
 *   - Đánh dấu đã chi: kỳ processing / failed, hoặc pending khi CHƯA cấu hình PayOS.
 * Response kỳ không có `updatedAt` nên "treo" ước lượng bằng `createdAt` (≤ updatedAt): kỳ tạo
 * chưa tới 10 phút chắc chắn chưa treo; còn lại để backend quyết và báo lỗi nếu chưa đủ điều kiện.
 */
function payoutActions(payout: ShopPayoutResponse, configured: boolean, now: number) {
  const status = payout.status;
  const mayBeStuck = status === "processing" && now - new Date(payout.createdAt).getTime() > STUCK_PROCESSING_MS;
  return {
    canRetry: configured && Number(payout.netPayout) > 0 && (status === "failed" || status === "pending" || mayBeStuck),
    canMarkPaid: status === "processing" || status === "failed" || (status === "pending" && !configured),
    waitingProcessing: status === "processing" && !mayBeStuck,
  };
}

const lineColumns: ColumnDef<ShopPayoutLineResponse>[] = [
  {
    id: "order",
    header: "Đơn / dòng",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-semibold">{row.original.orderCode}</span>
        {row.original.kind === "refund" ? <StatusBadge tone="warning">Hoàn tiền</StatusBadge> : null}
      </div>
    ),
  },
  { id: "gross", header: "Tiền hàng / hoàn", cell: ({ row }) => <span className="tabular-nums">{formatVnd(row.original.gross)}</span> },
  { id: "commission", header: "Hoa hồng", cell: ({ row }) => <span className="tabular-nums">{formatVnd(row.original.commission)}</span> },
];

/*
 * Chi tiết một kỳ đối soát (Sheet bên phải): số liệu, tài khoản nhận (đã che số), mã
 * chứng từ, lý do lỗi, bảng dòng đơn bán / hoàn và các hành động chi tiền. Màn cha chỉ
 * mount khi có kỳ được chọn.
 */
export function PayoutDetailSheet({
  payoutId,
  shopLabel,
  onClose,
}: {
  payoutId: string;
  /** Dịch `shopId` → tên (payout không kèm tên shop). */
  shopLabel: (shopId: string) => string;
  onClose: () => void;
}) {
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        <PayoutDetailBody payoutId={payoutId} shopLabel={shopLabel} />
      </SheetContent>
    </Sheet>
  );
}

function PayoutDetailBody({ payoutId, shopLabel }: { payoutId: string; shopLabel: (shopId: string) => string }) {
  const { data, isPending, error } = useAdminPayoutDetail(payoutId);
  const payos = usePayosBalance();
  const retry = useRetryPayout();
  const [retryOpen, setRetryOpen] = useState(false);
  const [paidOpen, setPaidOpen] = useState(false);
  // Chụp mốc "bây giờ" một lần lúc mở khung — render không được gọi Date.now() trực tiếp.
  const [now] = useState(() => Date.now());
  const lines = useMemo(() => data?.lines ?? [], [data]);

  if (error) {
    return (
      <>
        <SheetHeader>
          <SheetTitle>Chi tiết kỳ đối soát</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <ApiErrorState error={error} fallback={LOAD_ERROR} compact />
        </div>
      </>
    );
  }

  if (isPending || !data) {
    return (
      <>
        <SheetHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </SheetHeader>
        <div className="flex flex-col gap-3 px-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </>
    );
  }

  const { payout } = data;
  const configured = payos.data?.configured ?? false;
  const { canRetry, canMarkPaid, waitingProcessing } = payoutActions(payout, configured, now);

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex flex-wrap items-center gap-2">
          <span className="font-mono">{payout.code}</span>
          <PayoutStatusBadge status={payout.status} />
        </SheetTitle>
        <SheetDescription>
          {shopLabel(payout.shopId)} · <PayoutPeriod start={payout.periodStart} end={payout.periodEnd} />
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-6">
        {canRetry || canMarkPaid ? (
          <PermissionGate permission={PERMISSIONS.supplierPayoutProcess}>
            <div className="flex flex-wrap gap-2">
              {canRetry ? (
                <Button variant="outline" disabled={retry.isPending} onClick={() => setRetryOpen(true)}>
                  <RefreshCwIcon className="size-4" />
                  Gửi lại lệnh chi
                </Button>
              ) : null}
              {canMarkPaid ? (
                <Button onClick={() => setPaidOpen(true)}>
                  <CheckCheckIcon className="size-4" />
                  Đánh dấu đã chi
                </Button>
              ) : null}
            </div>
          </PermissionGate>
        ) : null}
        {waitingProcessing && configured ? (
          <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
            Lệnh chi đang xử lý. Chỉ gửi lại được khi treo quá 10 phút; hoặc đối chiếu trên bảng điều khiển PayOS rồi &quot;Đánh dấu đã chi&quot;.
          </p>
        ) : null}
        {payout.status === "pending" && configured ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            PayOS đã cấu hình nên kỳ này chưa chi được bằng tay — kiểm tra shop đã khai tài khoản ngân hàng rồi &quot;Gửi lại lệnh chi&quot;.
          </p>
        ) : null}
        {payout.failReason ? (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <span className="font-medium">Lý do lỗi:</span> {payout.failReason}
          </p>
        ) : null}

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Số liệu kỳ</h3>
          <DetailList
            rows={[
              { label: "Doanh thu", value: formatVnd(payout.grossRevenue) },
              { label: "Hoa hồng sàn", value: formatVnd(payout.commission) },
              { label: "Hoàn tiền", value: formatVnd(payout.refundAmount) },
              { label: "Nợ mang sang", value: formatVnd(payout.carriedDebt) },
              { label: "Thực chi", value: <NetPayoutAmount value={payout.netPayout} /> },
            ]}
          />
          <p className="text-xs text-muted-foreground">
            Thực chi = doanh thu − hoa hồng − hoàn tiền − nợ mang sang. Số âm nghĩa là shop còn nợ sàn, mang sang kỳ sau.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Chi trả</h3>
          <DetailList
            rows={[
              { label: "TK nhận tiền", value: payout.bankAccountMasked ?? "Chưa có (shop chưa khai báo tài khoản)" },
              { label: "Mã chứng từ", value: payout.providerRef ?? "—" },
              { label: "Đã chi lúc", value: formatDateTime(payout.paidAt) },
              { label: "Tạo lúc", value: formatDateTime(payout.createdAt) },
            ]}
          />
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Dòng đối soát ({lines.length})</h3>
          <DataTable columns={lineColumns} data={lines} pageSize={10} />
        </section>
      </div>

      <ConfirmDialog
        open={retryOpen}
        onOpenChange={setRetryOpen}
        title={`Gửi lại lệnh chi ${payout.code}?`}
        description={`Gửi lệnh chuyển ${formatVnd(payout.netPayout)} cho ${shopLabel(payout.shopId)} qua PayOS. Lệnh dùng mã kỳ làm khoá chống chi trùng.`}
        confirmLabel="Gửi lại"
        onConfirm={() => retry.mutate(payout.id)}
      />
      {paidOpen ? <MarkPaidDialog payout={payout} onClose={() => setPaidOpen(false)} /> : null}
    </>
  );
}
