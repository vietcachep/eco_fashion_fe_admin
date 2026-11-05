"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { BadgeCheckIcon, CheckCheckIcon, LockOpenIcon, RefreshCwIcon, SearchCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { DetailList } from "@/components/shared/detail-list";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDateTime, formatVnd } from "@/lib/format";
import type { ShopPayoutLineResponse, ShopPayoutResponse } from "@/lib/api/generated/model";
import { MarkPaidDialog } from "@/features/shop/components/platform/mark-paid-dialog";
import {
  NetPayoutAmount,
  PayoutGatewayBadge,
  PayoutPeriod,
  PayoutStatusBadge,
  payoutShopLabel,
} from "@/features/shop/components/platform/payout-cells";
import {
  payoutActionError,
  useAdminPayoutDetail,
  useApprovePayout,
  usePayosBalance,
  useReconcilePayout,
  useReleasePayout,
  useRetryPayout,
} from "@/features/shop/hooks/use-admin-payouts";

const LOAD_ERROR = "Không tải được chi tiết kỳ đối soát.";

/*
 * Thao tác khả dụng theo trạng thái kỳ (khớp backend, PLAN-0040 6.2):
 *   - Duyệt:            kỳ awaiting_approval (vượt hạn mức tự chi) — quyền supplier.payout.approve.
 *   - Đối chiếu PayOS:  kỳ processing / unknown — hỏi PayOS kết quả lệnh chi (paid / failed / giữ nguyên).
 *   - Mở giữ:           kỳ held — chỉ thành công khi mọi lý do giữ đã hết (còn lý do ⇒ 409 PAYOUT_STILL_HELD).
 *   - Gửi lại lệnh chi: CHỈ kỳ failed, hoặc pending khi đã có khoá payout (PayOS đã cấu hình). processing / unknown KHÔNG gửi lại
 *                       được (backend 409) — phải đối chiếu trước, tránh chi trùng.
 *   - Đánh dấu đã chi:  kỳ failed; pending khi CHƯA cấu hình PayOS; processing / unknown chỉ khi kế toán tick xác nhận lệnh PayOS
 *                       KHÔNG được thực hiện (hộp thoại bắt buộc).
 * Kỳ merged / deferred / carried / settled / paid không có thao tác.
 */
function payoutActions(payout: ShopPayoutResponse, configured: boolean) {
  const s = payout.status;
  const inFlight = s === "processing" || s === "unknown";
  return {
    canApprove: s === "awaiting_approval",
    canReconcile: inFlight,
    canRelease: s === "held",
    canRetry: configured && Number(payout.netPayout) > 0 && (s === "failed" || s === "pending"),
    canMarkPaid: inFlight || s === "failed" || (s === "pending" && !configured),
  };
}

/* Dòng hoàn tiền cũ không khớp được đơn thì còn mã kỹ thuật RF-… (không có trang) — chỉ các dòng mang mã đơn thật mới mở được đơn. */
const hasOrderPage = (orderCode: string) => !orderCode.startsWith("RF-");

const lineColumns: ColumnDef<ShopPayoutLineResponse>[] = [
  {
    id: "order",
    header: "Đơn / dòng",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {hasOrderPage(row.original.orderCode) ? (
          <Link href={`${ROUTES.order.orders}/${row.original.orderCode}`} className="font-mono text-xs font-semibold hover:underline">
            {row.original.orderCode}
          </Link>
        ) : (
          <span className="font-mono text-xs font-semibold">{row.original.orderCode}</span>
        )}
        {row.original.kind === "refund" ? <StatusBadge tone="warning">Hoàn tiền</StatusBadge> : null}
      </div>
    ),
  },
  { id: "gross", header: "Tiền hàng / hoàn", cell: ({ row }) => <span className="tabular-nums">{formatVnd(row.original.gross)}</span> },
  { id: "commission", header: "Hoa hồng", cell: ({ row }) => <span className="tabular-nums">{formatVnd(row.original.commission)}</span> },
];

/* Khung thông báo màu theo mức độ — dùng cho hướng dẫn theo trạng thái kỳ. */
const NOTE_TONE = {
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  warn: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  danger: "border-destructive/30 bg-destructive/5 text-destructive",
  muted: "border-border bg-muted/40 text-muted-foreground",
} as const;

function Note({ tone, role, children }: { tone: keyof typeof NOTE_TONE; role?: "alert"; children: React.ReactNode }) {
  return (
    <p role={role} className={`rounded-lg border px-3 py-2 text-sm ${NOTE_TONE[tone]}`}>
      {children}
    </p>
  );
}

/*
 * Chi tiết một kỳ đối soát (Sheet bên phải): số liệu, tài khoản nhận (đã che số), mã chứng từ, kết quả cổng PayOS, lý do giữ / lỗi,
 * bảng dòng đơn bán / hoàn và các thao tác chi tiền theo trạng thái + quyền. Màn cha chỉ mount khi có kỳ được chọn.
 */
export function PayoutDetailSheet({ payoutId, onClose }: { payoutId: string; onClose: () => void }) {
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        <PayoutDetailBody payoutId={payoutId} />
      </SheetContent>
    </Sheet>
  );
}

function PayoutDetailBody({ payoutId }: { payoutId: string }) {
  const { data, isPending, error } = useAdminPayoutDetail(payoutId);
  const payos = usePayosBalance();
  const retry = useRetryPayout();
  const approve = useApprovePayout();
  const reconcile = useReconcilePayout();
  const release = useReleasePayout();
  const [retryOpen, setRetryOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [paidOpen, setPaidOpen] = useState(false);
  // Lỗi của thao tác gần nhất (409 PAYOUT_STILL_HELD, PAYOUT_NOT_APPROVABLE…): hiện cố định trên đầu khung, xoá khi bắt đầu thao tác mới.
  const [actionError, setActionError] = useState<string | null>(null);
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
  const { canApprove, canReconcile, canRelease, canRetry, canMarkPaid } = payoutActions(payout, configured);
  const busy = retry.isPending || approve.isPending || reconcile.isPending || release.isPending;
  const fail = (fallback: string) => ({ onError: (e: unknown) => setActionError(payoutActionError(e, fallback)) });

  const doApprove = () => {
    setActionError(null);
    approve.mutate(payout.id, fail("Duyệt kỳ chi thất bại."));
  };
  const doReconcile = () => {
    setActionError(null);
    reconcile.mutate({ id: payout.id, status: payout.status }, fail("Đối chiếu với PayOS thất bại."));
  };
  const doRelease = () => {
    setActionError(null);
    release.mutate(payout.id, fail("Mở giữ thất bại."));
  };
  const doRetry = () => {
    setActionError(null);
    retry.mutate(payout.id, fail("Gửi lại lệnh chi thất bại."));
  };

  const hasActions = canApprove || canReconcile || canRelease || canRetry || canMarkPaid;

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex flex-wrap items-center gap-2">
          <span className="font-mono">{payout.code}</span>
          <PayoutStatusBadge status={payout.status} />
          <PayoutGatewayBadge gatewayStatus={payout.gatewayStatus} />
        </SheetTitle>
        <SheetDescription>
          {payoutShopLabel(payout)} · <PayoutPeriod start={payout.periodStart} end={payout.periodEnd} />
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-6">
        {hasActions ? (
          <div className="flex flex-wrap gap-2">
            {canApprove ? (
              <PermissionGate permission={PERMISSIONS.supplierPayoutApprove}>
                <Button disabled={busy} onClick={() => setApproveOpen(true)}>
                  <BadgeCheckIcon className="size-4" />
                  Duyệt kỳ chi
                </Button>
              </PermissionGate>
            ) : null}
            {canReconcile ? (
              <PermissionGate permission={PERMISSIONS.supplierPayoutProcess}>
                <Button variant="outline" disabled={busy} onClick={doReconcile}>
                  <SearchCheckIcon className="size-4" />
                  Đối chiếu PayOS
                </Button>
              </PermissionGate>
            ) : null}
            {canRelease ? (
              <PermissionGate permission={PERMISSIONS.supplierPayoutProcess}>
                <Button variant="outline" disabled={busy} onClick={() => setReleaseOpen(true)}>
                  <LockOpenIcon className="size-4" />
                  Mở giữ
                </Button>
              </PermissionGate>
            ) : null}
            {canRetry ? (
              <PermissionGate permission={PERMISSIONS.supplierPayoutProcess}>
                <Button variant="outline" disabled={busy} onClick={() => setRetryOpen(true)}>
                  <RefreshCwIcon className="size-4" />
                  Thử lại
                </Button>
              </PermissionGate>
            ) : null}
            {canMarkPaid ? (
              <PermissionGate permission={PERMISSIONS.supplierPayoutProcess}>
                <Button variant={canReconcile ? "outline" : "default"} disabled={busy} onClick={() => setPaidOpen(true)}>
                  <CheckCheckIcon className="size-4" />
                  Đánh dấu đã chi
                </Button>
              </PermissionGate>
            ) : null}
          </div>
        ) : null}

        {actionError ? <Note tone="danger" role="alert">{actionError}</Note> : null}

        {payout.status === "awaiting_approval" ? (
          <Note tone="warn">Thực chi vượt hạn mức tự chi nên kỳ này chờ duyệt. Người có quyền duyệt bấm &quot;Duyệt kỳ chi&quot; thì lệnh chi mới được gửi PayOS.</Note>
        ) : null}
        {payout.status === "held" ? (
          <Note tone="warn">
            <span className="font-medium">Đang giữ:</span> {payout.holdReason ?? "Chưa có lý do ghi nhận."}
            <span className="mt-1 block text-xs opacity-90">
              Hệ thống tự mở giữ khi mọi lý do hết (mỗi 5 phút). &quot;Mở giữ&quot; chỉ thành công khi không còn lý do nào — còn lý do sẽ báo nguyên văn.
            </span>
          </Note>
        ) : null}
        {payout.status === "unknown" ? (
          <Note tone="danger" role="alert">
            Đã gửi lệnh chi nhưng KHÔNG rõ kết quả — PayOS có thể đã chuyển tiền. KHÔNG gửi lại lệnh và KHÔNG chi tay trước khi bấm &quot;Đối chiếu PayOS&quot;.
          </Note>
        ) : null}
        {payout.status === "processing" ? (
          <Note tone="info">
            Lệnh chi đang xử lý. Hệ thống tự đối chiếu với PayOS mỗi 5 phút; bấm &quot;Đối chiếu PayOS&quot; để hỏi ngay. Không gửi lại lệnh khi chưa có kết quả.
          </Note>
        ) : null}
        {payout.status === "pending" && configured ? (
          <Note tone="warn">PayOS đã cấu hình nên kỳ này chưa chi được bằng tay — kiểm tra shop đã khai tài khoản ngân hàng rồi bấm &quot;Thử lại&quot;.</Note>
        ) : null}
        {payout.status === "deferred" ? (
          <Note tone="muted">Thực chi dưới mức tối thiểu nên chưa chi — số tiền sẽ được dồn vào kỳ sau.</Note>
        ) : null}
        {payout.status === "merged" ? <Note tone="muted">Kỳ này đã được cộng dồn vào kỳ sau — chỉ để tra cứu, không thao tác được.</Note> : null}
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
              { label: "Kết quả cổng PayOS", value: payout.gatewayStatus ? <PayoutGatewayBadge gatewayStatus={payout.gatewayStatus} /> : "Chưa gửi lệnh / chi tay" },
              ...(payout.holdReason ? [{ label: "Lý do giữ", value: payout.holdReason }] : []),
              { label: "Mã chứng từ", value: payout.providerRef ?? "—" },
              { label: "Đã chi lúc", value: formatDateTime(payout.paidAt) },
              { label: "Tạo lúc", value: formatDateTime(payout.createdAt) },
              { label: "Cập nhật lúc", value: formatDateTime(payout.updatedAt) },
            ]}
          />
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Dòng đối soát ({lines.length})</h3>
          <DataTable columns={lineColumns} data={lines} pageSize={10} />
        </section>
      </div>

      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title={`Duyệt kỳ chi ${payout.code}?`}
        description={`Gửi lệnh chuyển ${formatVnd(payout.netPayout)} cho ${payoutShopLabel(payout)} qua PayOS. Bị chặn nếu shop đang bị khoá hoặc vừa đổi tài khoản ngân hàng.`}
        confirmLabel="Duyệt và gửi PayOS"
        onConfirm={doApprove}
      />
      <ConfirmDialog
        open={releaseOpen}
        onOpenChange={setReleaseOpen}
        title={`Mở giữ kỳ ${payout.code}?`}
        description="Chỉ mở được khi mọi lý do giữ đã hết. Kỳ sẽ đi tiếp (chờ chi hoặc chờ duyệt)."
        confirmLabel="Mở giữ"
        onConfirm={doRelease}
      />
      <ConfirmDialog
        open={retryOpen}
        onOpenChange={setRetryOpen}
        title={`Gửi lại lệnh chi ${payout.code}?`}
        description={`Gửi lệnh chuyển ${formatVnd(payout.netPayout)} cho ${payoutShopLabel(payout)} qua PayOS. Lệnh dùng mã kỳ làm khoá chống chi trùng.`}
        confirmLabel="Gửi lại"
        onConfirm={doRetry}
      />
      {paidOpen ? <MarkPaidDialog payout={payout} onClose={() => setPaidOpen(false)} /> : null}
    </>
  );
}
