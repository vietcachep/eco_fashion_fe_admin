"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BanknoteIcon, InfoIcon, Loader2Icon, LockIcon, LockOpenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { DataTable } from "@/components/shared/data-table";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { FormMessage } from "@/components/shared/form-message";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime, formatVnd } from "@/lib/format";
import { PERMISSIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { SignedMoney } from "@/features/shop/components/vendor/signed-money";
import { useMyDeposits, useMyWallet, useMyWalletTransactions, useRequestDeposit } from "@/features/shop/hooks/use-wallet";
import { DEPOSIT_STATUS_META, WALLET_TX_LABEL } from "@/features/shop/components/wallet-labels";
import type { WalletDeposit, WalletTransaction } from "@/features/shop/types/wallet";

const PAGE_SIZE = 10;

/*
 * Ví đặt cọc COD của gian hàng (vendor). Shop chỉ nhận COD khi ví > 0: nộp cọc cho sàn → sàn duyệt → ví cộng; mỗi đơn COD
 * giao thành công sàn tự trừ hoa hồng của đơn. Về 0 hoặc âm thì COD đóng; số âm được trừ vào khoản nộp thêm kế tiếp.
 */
export function VendorWalletScreen() {
  const wallet = useMyWallet();
  const [depositOpen, setDepositOpen] = useState(false);
  const [tab, setTab] = useState<"tx" | "deposits">("tx");

  if (wallet.error) return <ApiErrorState error={wallet.error} fallback="Không tải được ví đặt cọc." />;
  if (wallet.isPending || !wallet.data) return <Skeleton className="h-40 w-full rounded-xl" />;
  const w = wallet.data;
  const balance = Number(w.balance);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Số dư ví đặt cọc</p>
            <p className={cn("text-3xl font-semibold tabular-nums", balance < 0 && "text-destructive")}>{formatVnd(balance)}</p>
            <div className="flex items-center gap-2 text-sm">
              {w.codEnabled ? (
                <StatusBadge tone="success">
                  <LockOpenIcon className="mr-1 inline size-3" />
                  {w.exempt ? "COD mở (gian hàng chính chủ)" : "COD đang mở"}
                </StatusBadge>
              ) : (
                <StatusBadge tone="danger">
                  <LockIcon className="mr-1 inline size-3" />
                  COD đang đóng — cần nộp thêm cọc
                </StatusBadge>
              )}
              {balance < 0 ? <span className="text-xs text-destructive">Còn nợ sàn {formatVnd(-balance)} — sẽ trừ vào khoản nộp tiếp theo</span> : null}
            </div>
          </div>
          <PermissionGate permission={PERMISSIONS.shopWalletDepositRequest}>
            <Button onClick={() => setDepositOpen(true)} disabled={!!w.pendingDeposit}>
              <BanknoteIcon className="size-4" />
              Nộp tiền đặt cọc
            </Button>
          </PermissionGate>
        </CardContent>
      </Card>

      {w.pendingDeposit ? (
        <Card size="sm">
          <CardContent className="text-sm">
            Yêu cầu nộp <b>{formatVnd(w.pendingDeposit.amount)}</b> (mã GD {w.pendingDeposit.transferRef}) đang chờ sàn đối chiếu và duyệt.
          </CardContent>
        </Card>
      ) : null}

      <Card size="sm">
        <CardContent className="flex items-start gap-3">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-muted-foreground">
            <li>Chỉ khi ví đặt cọc <b className="text-foreground">lớn hơn 0</b>, khách mới chọn được thanh toán khi nhận hàng (COD) cho sản phẩm của bạn.</li>
            <li>Mỗi đơn COD giao thành công, sàn <b className="text-foreground">tự trừ hoa hồng của đơn</b> khỏi ví. Ví về 0 hoặc âm thì COD đóng cho đơn mới (đơn đang giao không bị huỷ).</li>
            <li>Ví âm là khoản bạn còn nợ sàn: lần nộp cọc tiếp theo sẽ <b className="text-foreground">trừ nợ trước</b>, phần còn dư mới mở lại COD.</li>
            <li>Tối thiểu {formatVnd(w.minDeposit)} mỗi lần. {w.instructions}</li>
          </ul>
        </CardContent>
      </Card>

      <FilterTabs
        tabs={[
          { key: "tx", label: "Lịch sử ví" },
          { key: "deposits", label: "Yêu cầu nộp cọc" },
        ]}
        value={tab}
        onChange={(v) => setTab(v as "tx" | "deposits")}
      />
      {tab === "tx" ? <TransactionsTable /> : <MyDepositsTable />}
      {depositOpen ? <DepositDialog minDeposit={w.minDeposit} instructions={w.instructions} onClose={() => setDepositOpen(false)} /> : null}
    </div>
  );
}

function TransactionsTable() {
  const [pageIndex, setPageIndex] = useState(0);
  const { data, isLoading } = useMyWalletTransactions(pageIndex + 1, PAGE_SIZE);
  const columns: ColumnDef<WalletTransaction>[] = useMemo(
    () => [
      { id: "at", header: "Thời gian", cell: ({ row }) => <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(row.original.createdAt)}</span> },
      { id: "type", header: "Loại", cell: ({ row }) => WALLET_TX_LABEL[row.original.type] ?? row.original.type },
      { id: "order", header: "Đơn / ghi chú", cell: ({ row }) => <span className="text-sm">{row.original.note ?? row.original.orderCode ?? "—"}</span> },
      { id: "amount", header: "Biến động", cell: ({ row }) => <SignedMoney value={row.original.amount} /> },
      { id: "after", header: "Số dư sau", cell: ({ row }) => <span className="tabular-nums">{formatVnd(row.original.balanceAfter)}</span> },
    ],
    [],
  );
  return (
    <DataTable
      columns={columns}
      data={data?.content ?? []}
      loading={isLoading}
      serverPagination={{ pageIndex, pageSize: PAGE_SIZE, pageCount: data?.totalPages || 1, total: data?.totalElements ?? 0, onPageChange: setPageIndex }}
    />
  );
}

function MyDepositsTable() {
  const [pageIndex, setPageIndex] = useState(0);
  const { data, isLoading } = useMyDeposits(pageIndex + 1, PAGE_SIZE);
  const columns: ColumnDef<WalletDeposit>[] = useMemo(
    () => [
      { id: "at", header: "Gửi lúc", cell: ({ row }) => <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(row.original.createdAt)}</span> },
      { id: "amount", header: "Số tiền", cell: ({ row }) => <span className="font-medium tabular-nums">{formatVnd(row.original.amount)}</span> },
      { id: "ref", header: "Mã giao dịch", cell: ({ row }) => <span className="font-mono text-xs">{row.original.transferRef}</span> },
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
    ],
    [],
  );
  return (
    <DataTable
      columns={columns}
      data={data?.content ?? []}
      loading={isLoading}
      serverPagination={{ pageIndex, pageSize: PAGE_SIZE, pageCount: data?.totalPages || 1, total: data?.totalElements ?? 0, onPageChange: setPageIndex }}
    />
  );
}

function DepositDialog({ minDeposit, instructions, onClose }: { minDeposit: number; instructions: string; onClose: () => void }) {
  const request = useRequestDeposit();
  const schema = useMemo(
    () =>
      z.object({
        amount: z
          .string()
          .regex(/^[1-9]\d{0,13}$/, "Nhập số tiền (chỉ chữ số)")
          .refine((v) => Number(v) >= minDeposit, `Tối thiểu ${formatVnd(minDeposit)}`),
        transferRef: z.string().trim().min(3, "Nhập mã giao dịch (tối thiểu 3 ký tự)").max(120, "Tối đa 120 ký tự"),
        note: z.string().trim().max(500, "Tối đa 500 ký tự"),
      }),
    [minDeposit],
  );
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { amount: "", transferRef: "", note: "" } });
  const errors = form.formState.errors;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nộp tiền đặt cọc COD</DialogTitle>
          <DialogDescription>{instructions}</DialogDescription>
        </DialogHeader>
        <form
          id="deposit-form"
          noValidate
          onSubmit={form.handleSubmit((v) => request.mutate({ amount: v.amount, transferRef: v.transferRef, note: v.note || undefined }, { onSuccess: onClose }))}
        >
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="deposit-amount">Số tiền đã chuyển (VND)</FieldLabel>
              <Input id="deposit-amount" inputMode="numeric" placeholder="2000000" aria-invalid={!!errors.amount} {...form.register("amount", { setValueAs: (v: string) => v.replace(/\D/g, "") })} />
              <FormMessage message={errors.amount?.message} />
            </Field>
            <Field>
              <FieldLabel htmlFor="deposit-ref">Mã giao dịch / nội dung chuyển khoản</FieldLabel>
              <Input id="deposit-ref" placeholder="FT26102312345" aria-invalid={!!errors.transferRef} {...form.register("transferRef")} />
              <FormMessage message={errors.transferRef?.message} />
            </Field>
            <Field>
              <FieldLabel htmlFor="deposit-note">Ghi chú (tuỳ chọn)</FieldLabel>
              <Input id="deposit-note" aria-invalid={!!errors.note} {...form.register("note")} />
              <FormMessage message={errors.note?.message} />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" form="deposit-form" disabled={request.isPending}>
            {request.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Gửi yêu cầu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
