"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { DataTable } from "@/components/shared/data-table";
import { DetailList } from "@/components/shared/detail-list";
import { StatusBadge } from "@/components/shared/status-badge";
import { ROUTES } from "@/lib/constants";
import { formatDate, formatDateTime, formatVnd } from "@/lib/format";
import { statusMeta, VENDOR_PAYOUT_STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { ShopPayoutDetailResponse, ShopPayoutLineResponse } from "@/lib/api/generated/model";
import { useMyShopPayoutDetail } from "@/features/shop/hooks/use-shop-payouts";
import { SignedMoney } from "@/features/shop/components/vendor/signed-money";

const LOAD_ERROR = "Không tải được chi tiết kỳ đối soát.";

/*
 * Chi tiết một kỳ đối soát: bảng tính từ doanh thu tới thực nhận + các dòng đơn bán / hoàn tiền. Thân tách riêng với
 * `key={payoutId}` để mỗi kỳ là một lần dựng mới (không giữ trang của bảng dòng từ kỳ trước).
 */
export function VendorPayoutDetailSheet({ payoutId, onClose }: { payoutId: string | null; onClose: () => void }) {
  return (
    <Sheet open={!!payoutId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        {payoutId ? <PayoutDetailBody key={payoutId} id={payoutId} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function PayoutDetailBody({ id }: { id: string }) {
  const { data, isPending, error } = useMyShopPayoutDetail(id);

  if (error) {
    return (
      <div className="p-4">
        <ApiErrorState error={error} fallback={LOAD_ERROR} compact />
      </div>
    );
  }
  if (isPending || !data) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }
  return <PayoutDetailContent detail={data} />;
}

function PayoutDetailContent({ detail }: { detail: ShopPayoutDetailResponse }) {
  const { payout, lines } = detail;
  const meta = statusMeta(VENDOR_PAYOUT_STATUS, payout.status);
  const net = Number(payout.netPayout);

  const columns: ColumnDef<ShopPayoutLineResponse>[] = useMemo(
    () => [
      {
        id: "kind",
        header: "Loại",
        cell: ({ row }) =>
          row.original.kind === "refund" ? <StatusBadge tone="warning">Hoàn tiền</StatusBadge> : <StatusBadge tone="success">Đơn bán</StatusBadge>,
      },
      {
        id: "orderCode",
        header: "Mã đơn / dòng",
        cell: ({ row }) =>
          // Dòng sale là mã đơn → mở được trang đơn; dòng refund là mã hoàn tiền RF-… không có trang riêng.
          row.original.kind === "sale" ? (
            <Link href={`${ROUTES.vendor.orders}/${row.original.orderCode}`} className="font-mono text-xs hover:underline">
              {row.original.orderCode}
            </Link>
          ) : (
            <span className="font-mono text-xs">{row.original.orderCode}</span>
          ),
      },
      {
        id: "gross",
        header: () => <span className="block text-right">Tiền hàng / hoàn</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <SignedMoney value={row.original.kind === "refund" ? -Number(row.original.gross) : Number(row.original.gross)} />
          </div>
        ),
      },
      {
        id: "commission",
        header: () => <span className="block text-right">Hoa hồng</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <SignedMoney value={row.original.kind === "refund" ? Number(row.original.commission) : -Number(row.original.commission)} />
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <SheetHeader className="pr-12">
        <SheetTitle className="font-mono">{payout.code}</SheetTitle>
        <SheetDescription>
          Kỳ {formatDate(payout.periodStart)} → {formatDate(payout.periodEnd)}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-5 px-4 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Thực nhận</p>
            <p className={cn("mt-0.5 font-heading text-2xl font-semibold tabular-nums", net < 0 && "text-destructive")}>
              {formatVnd(net)}
            </p>
          </div>
          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
        </div>
        {payout.status === "carried" ? (
          <p className="text-xs text-muted-foreground">Thực nhận âm nên kỳ này không chi tiền — khoản nợ được mang sang và trừ vào kỳ sau.</p>
        ) : null}
        {payout.status === "failed" && payout.failReason ? (
          <p role="status" className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            {payout.failReason}
          </p>
        ) : null}

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Cách tính</h3>
          <DetailList
            rows={[
              { label: "Doanh thu (đơn đã qua hạn đổi trả)", value: <SignedMoney value={payout.grossRevenue} /> },
              { label: "Hoa hồng sàn (ròng)", value: <SignedMoney value={-Number(payout.commission)} /> },
              { label: "Hoàn tiền cho khách", value: <SignedMoney value={-Number(payout.refundAmount)} /> },
              { label: "Nợ kỳ trước", value: <SignedMoney value={-Number(payout.carriedDebt)} /> },
              { label: "Thực nhận", value: <SignedMoney value={net} showPlus={false} /> },
            ]}
          />
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Thông tin chi trả</h3>
          <DetailList
            rows={[
              { label: "Tài khoản nhận", value: <span className="font-mono">{payout.bankAccountMasked ?? "—"}</span> },
              { label: "Ngày chi", value: payout.paidAt ? formatDateTime(payout.paidAt) : "—" },
              ...(payout.providerRef ? [{ label: "Mã giao dịch", value: <span className="font-mono">{payout.providerRef}</span> }] : []),
              { label: "Tạo kỳ lúc", value: formatDateTime(payout.createdAt) },
            ]}
          />
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Các dòng trong kỳ ({lines.length})</h3>
          <DataTable columns={columns} data={lines} pageSize={8} />
          <p className="text-xs text-muted-foreground">
            Dòng hoàn tiền: trừ số tiền hoàn khỏi kỳ, sàn hoàn lại phần hoa hồng đã thu trên hàng bị hoàn. Dấu − là khoản trừ khỏi bạn, + là khoản cộng cho bạn.
          </p>
        </section>
      </div>
    </>
  );
}
