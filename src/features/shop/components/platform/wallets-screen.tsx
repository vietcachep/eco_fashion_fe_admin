"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckIcon, Loader2Icon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { FormMessage } from "@/components/shared/form-message";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { isForbiddenError } from "@/lib/api-error";
import { PERMISSIONS } from "@/lib/constants";
import { formatDateTime, formatNumber, formatVnd } from "@/lib/format";
import { ReasonDialog } from "@/features/shop/components/platform/reason-dialog";
import { WalletTopupsTab } from "@/features/shop/components/platform/wallet-topups-tab";
import { DEPOSIT_STATUS_META } from "@/features/shop/components/wallet-labels";
import { useAdjustWallet, useAdminDeposits, useAdminWallets, useApproveDeposit, useRejectDeposit } from "@/features/shop/hooks/use-wallet";
import { SignedMoney } from "@/features/shop/components/vendor/signed-money";
import type { WalletDeposit, WalletSummary } from "@/features/shop/types/wallet";

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được dữ liệu ví đặt cọc.";
const TABS = [
  { key: "deposits", label: "Khoản nộp cọc" },
  { key: "wallets", label: "Ví các gian hàng" },
  { key: "topups", label: "Nạp qua PayOS" },
] as const;
const DEPOSIT_TABS = [
  { key: "pending", label: "Chờ duyệt" },
  { key: "approved", label: "Đã duyệt" },
  { key: "rejected", label: "Đã từ chối" },
  { key: "", label: "Tất cả" },
] as const;
const WALLET_TABS = [
  { key: "", label: "Tất cả ví" },
  { key: "low", label: "COD đang đóng (≤ 0)" },
] as const;

/*
 * Ví đặt cọc COD toàn sàn (quyền supplier.wallet.read; duyệt / từ chối cần supplier.wallet.approve; chỉnh ví tay chỉ Admin — supplier.wallet.adjust). Ba tab:
 * khoản nộp cọc chờ kế toán đối chiếu sao kê rồi duyệt (cộng ví), và danh sách ví từng gian hàng (sắp xếp số dư thấp nhất lên đầu).
 * Tab thứ ba (PLAN-0041) chỉ để xem khoản nạp qua PayOS: ví đã tự được ghi có khi PayOS xác nhận nên sàn không duyệt tay.
 */
export function WalletsScreen() {
  const [tab, setTab] = useState<string>("deposits");
  return (
    <div className="flex flex-col gap-3">
      <FilterTabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === "topups" ? <WalletTopupsTab /> : tab === "wallets" ? <WalletsTable /> : <DepositsTable />}
    </div>
  );
}

function DepositsTable() {
  const [status, setStatus] = useState("pending");
  const [pageIndex, setPageIndex] = useState(0);
  const { data, isLoading, isError, error } = useAdminDeposits({ status, page: pageIndex + 1, size: PAGE_SIZE });
  const approve = useApproveDeposit();
  const reject = useRejectDeposit();
  const [toApprove, setToApprove] = useState<WalletDeposit | null>(null);
  const [toReject, setToReject] = useState<WalletDeposit | null>(null);

  const columns: ColumnDef<WalletDeposit>[] = useMemo(
    () => [
      { id: "at", header: "Gửi lúc", cell: ({ row }) => <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(row.original.createdAt)}</span> },
      { id: "shop", header: "Gian hàng", cell: ({ row }) => <span className="font-medium">{row.original.shopName ?? `Shop …${row.original.shopId.slice(0, 8)}`}</span> },
      { id: "amount", header: "Số tiền", cell: ({ row }) => <span className="font-semibold tabular-nums">{formatVnd(row.original.amount)}</span> },
      {
        id: "ref",
        header: "Mã giao dịch để đối chiếu",
        cell: ({ row }) => (
          <div className="leading-tight">
            <span className="font-mono text-xs">{row.original.transferRef}</span>
            {row.original.note ? <p className="text-xs text-muted-foreground">{row.original.note}</p> : null}
          </div>
        ),
      },
      {
        id: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const m = DEPOSIT_STATUS_META[row.original.status];
          return (
            <div className="flex flex-col gap-0.5">
              <StatusBadge tone={m.tone}>{m.label}</StatusBadge>
              {row.original.rejectReason ? <span className="text-xs text-destructive">{row.original.rejectReason}</span> : null}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) =>
          row.original.status === "pending" ? (
            <PermissionGate permission={PERMISSIONS.supplierWalletApprove}>
              <div className="flex justify-end gap-1.5">
                <Button size="sm" className="h-8" onClick={() => setToApprove(row.original)}>
                  <CheckIcon className="size-3.5" />
                  Duyệt
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-destructive" onClick={() => setToReject(row.original)}>
                  <XIcon className="size-3.5" />
                  Từ chối
                </Button>
              </div>
            </PermissionGate>
          ) : null,
      },
    ],
    [],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;
  return (
    <div className="flex flex-col gap-3">
      <FilterTabs
        tabs={DEPOSIT_TABS}
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
      <p className="text-xs text-muted-foreground">{formatNumber(data?.totalElements)} khoản nộp khớp bộ lọc. Chỉ duyệt khi đã thấy tiền về tài khoản sàn khớp mã giao dịch.</p>
      <p className="text-xs text-muted-foreground">Khoản nạp qua PayOS tự ghi có ví khi PayOS xác nhận — xem tab “Nạp qua PayOS”; không duyệt tay.</p>
      <ConfirmDialog
        open={!!toApprove}
        onOpenChange={(o) => !o && setToApprove(null)}
        title="Duyệt khoản nộp cọc?"
        description={toApprove ? `Cộng ${formatVnd(toApprove.amount)} vào ví của ${toApprove.shopName ?? "gian hàng"}. Số âm (nếu có) được bù trước; ví > 0 thì shop bán được COD.` : undefined}
        confirmLabel="Duyệt"
        onConfirm={() => toApprove && approve.mutate(toApprove.id, { onSettled: () => setToApprove(null) })}
      />
      {toReject ? (
        <ReasonDialog
          title="Từ chối khoản nộp cọc"
          description={`${toReject.shopName ?? "Gian hàng"} · ${formatVnd(toReject.amount)} · ${toReject.transferRef}`}
          label="Lý do"
          placeholder="Không thấy khoản chuyển khớp mã giao dịch…"
          confirmLabel="Từ chối"
          destructive
          rule={{ min: 3, max: 500, requiredMessage: "Nhập lý do (tối thiểu 3 ký tự)" }}
          pending={reject.isPending}
          onSubmit={(reason) => reject.mutate({ id: toReject.id, reason }, { onSuccess: () => setToReject(null) })}
          onClose={() => setToReject(null)}
        />
      ) : null}
    </div>
  );
}

function WalletsTable() {
  const [low, setLow] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const { data, isLoading, isError, error } = useAdminWallets({ lowOnly: low === "low", page: pageIndex + 1, size: PAGE_SIZE });
  const [adjusting, setAdjusting] = useState<WalletSummary | null>(null);

  const columns: ColumnDef<WalletSummary>[] = useMemo(
    () => [
      { id: "shop", header: "Gian hàng", cell: ({ row }) => <span className="font-medium">{row.original.shopName ?? `Shop …${row.original.shopId.slice(0, 8)}`}</span> },
      { id: "balance", header: "Số dư ví", cell: ({ row }) => <SignedMoney value={row.original.balance} showPlus={false} /> },
      {
        id: "cod",
        header: "COD",
        cell: ({ row }) => (row.original.codEnabled ? <StatusBadge tone="success">Đang mở</StatusBadge> : <StatusBadge tone="danger">Đang đóng</StatusBadge>),
      },
      { id: "updated", header: "Cập nhật", cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.updatedAt)}</span> },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => (
          <PermissionGate permission={PERMISSIONS.supplierWalletAdjust}>
            <div className="flex justify-end">
              <Button size="sm" variant="outline" className="h-8" onClick={() => setAdjusting(row.original)}>
                <SlidersHorizontalIcon className="size-3.5" />
                Chỉnh ví
              </Button>
            </div>
          </PermissionGate>
        ),
      },
    ],
    [],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;
  return (
    <div className="flex flex-col gap-3">
      <FilterTabs
        tabs={WALLET_TABS}
        value={low}
        onChange={(v) => {
          setLow(v);
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
      <p className="text-xs text-muted-foreground">Chỉ liệt kê gian hàng đã có ví (đã từng nộp cọc hoặc phát sinh đơn COD). Gian hàng chính chủ của sàn được miễn đặt cọc.</p>
      {adjusting ? <AdjustDialog wallet={adjusting} onClose={() => setAdjusting(null)} /> : null}
    </div>
  );
}

const adjustSchema = z.object({
  amount: z.string().regex(/^-?[1-9]\d{0,13}$/, "Nhập số tiền khác 0 (âm = trừ ví)"),
  note: z.string().trim().min(3, "Nhập lý do (tối thiểu 3 ký tự)").max(500, "Tối đa 500 ký tự"),
});

function AdjustDialog({ wallet, onClose }: { wallet: WalletSummary; onClose: () => void }) {
  const adjust = useAdjustWallet();
  const form = useForm<z.infer<typeof adjustSchema>>({ resolver: zodResolver(adjustSchema), defaultValues: { amount: "", note: "" } });
  const errors = form.formState.errors;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chỉnh ví — {wallet.shopName ?? "gian hàng"}</DialogTitle>
          <DialogDescription>Số dư hiện tại {formatVnd(wallet.balance)}. Số dương cộng ví, số âm trừ ví; mọi chỉnh sửa đều ghi sổ và audit.</DialogDescription>
        </DialogHeader>
        <form id="adjust-form" noValidate onSubmit={form.handleSubmit((v) => adjust.mutate({ shopId: wallet.shopId, amount: v.amount, note: v.note }, { onSuccess: onClose }))}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="adjust-amount">Số tiền (VND, có dấu)</FieldLabel>
              <Input id="adjust-amount" inputMode="numeric" placeholder="-100000" aria-invalid={!!errors.amount} {...form.register("amount", { setValueAs: (v: string) => v.replace(/[^\d-]/g, "") })} />
              <FormMessage message={errors.amount?.message} />
            </Field>
            <Field>
              <FieldLabel htmlFor="adjust-note">Lý do</FieldLabel>
              <Input id="adjust-note" aria-invalid={!!errors.note} {...form.register("note")} />
              <FormMessage message={errors.note?.message} />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" form="adjust-form" disabled={adjust.isPending}>
            {adjust.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
