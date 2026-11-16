"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { InfoIcon, LockIcon, LockOpenIcon, WalletIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { DataTable } from "@/components/shared/data-table";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime, formatVnd } from "@/lib/format";
import { PERMISSIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { SignedMoney } from "@/features/shop/components/vendor/signed-money";
import { useMyWallet, useMyWalletTransactions } from "@/features/shop/hooks/use-wallet";
import { WALLET_TX_LABEL } from "@/features/shop/components/wallet-labels";
import { ActiveTopupCard, isLiveTopup, useNow } from "@/features/shop/components/vendor/active-topup-card";
import { MyTopupsTable } from "@/features/shop/components/vendor/my-topups-table";
import { TopupDialog } from "@/features/shop/components/vendor/topup-dialog";
import type { WalletTransaction, WalletTxType } from "@/features/shop/types/wallet";

const PAGE_SIZE = 10;

/* Nhãn sổ cái cho chủ shop: dòng nạp tiền không nhắc tên cổng thanh toán. Màn sàn vẫn dùng WALLET_TX_LABEL gốc. */
const SHOP_TX_LABEL: Record<WalletTxType, string> = { ...WALLET_TX_LABEL, topup_payos: "Nạp tiền vào ví" };

/*
 * Ví đặt cọc COD của gian hàng (vendor). Shop chỉ nhận COD khi ví > 0: nạp tiền vào ví qua PayOS là đường nạp duy nhất, ví được cộng
 * ngay khi nhận tiền; mỗi đơn COD giao thành công sàn tự trừ hoa hồng của đơn. Về 0 hoặc âm thì COD đóng; số âm được trừ vào lần nạp kế tiếp.
 */
/* Lý do kỹ thuật backend trả về (không chứa khoá/giá trị cấu hình) — để chủ shop báo sàn đúng chỗ cần sửa. */
const UNAVAILABLE_HINT = {
  flag_off: "sàn đang tạm tắt nạp qua PayOS (tham số wallet.payos_deposit_enabled).",
  payos_not_configured: "hệ thống chưa cấu hình khoá PayOS thu tiền.",
  admin_url_invalid: "địa chỉ web quản trị của hệ thống chưa cấu hình đúng (cần https).",
} as const;

export function VendorWalletScreen() {
  const wallet = useMyWallet();
  // Gọi trước mọi return sớm (quy tắc hook). Mốc này quyết định khoản PayOS còn sống để khoá nút tạo link mới.
  const now = useNow();
  const [topupOpen, setTopupOpen] = useState(false);
  const [tab, setTab] = useState<"tx" | "topups">("tx");

  if (wallet.error) return <ApiErrorState error={wallet.error} fallback="Không tải được ví đặt cọc." />;
  if (wallet.isPending || !wallet.data) return <Skeleton className="h-40 w-full rounded-xl" />;
  const w = wallet.data;
  const balance = Number(w.balance);
  // `enabled` của BE đã gộp cờ bật + PayOS đã cấu hình + EF_ADMIN_URL dùng được. Khi tắt, chủ shop không còn đường nạp nào: màn hiện thông báo tạm thời không khả dụng (PLAN-0006: PayOS là đường nạp duy nhất).
  const payos = w.payosTopup;
  const payosOn = !!payos?.enabled;
  // Khoản đang chờ vẫn hiện thẻ khi cờ đã tắt (tiền về vẫn được ghi có), nên thẻ không phụ thuộc `enabled`.
  const activeTopup = payos?.active ?? null;
  const liveTopup = isLiveTopup(activeTopup, now) ? activeTopup : null;

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
                  COD đang đóng — cần nạp thêm tiền vào ví
                </StatusBadge>
              )}
              {balance < 0 ? <span className="text-xs text-destructive">Còn nợ sàn {formatVnd(-balance)} — sẽ trừ vào lần nạp tiền tiếp theo</span> : null}
            </div>
          </div>
          <PermissionGate permission={PERMISSIONS.shopWalletDepositRequest}>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
              {/* PayOS là đường nạp duy nhất của chủ shop. Cờ tắt hoặc PayOS chưa cấu hình thì không có đường dự phòng: báo trạng thái thay vì ẩn lặng lẽ. */}
              {payosOn ? (
                <>
                  <Button onClick={() => setTopupOpen(true)} disabled={!!liveTopup}>
                    <WalletIcon className="size-4" />
                    Nạp tiền vào ví
                  </Button>
                  {liveTopup ? <p className="text-xs text-muted-foreground">Đang có một lần nạp chờ thanh toán — xem thẻ bên dưới.</p> : null}
                </>
              ) : (
                <div role="status" className="max-w-xs rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  Nạp tiền vào ví đang tạm thời không khả dụng. Vui lòng liên hệ sàn.
                  {payos?.unavailableReason ? <span className="mt-1 block text-xs">Lý do: {UNAVAILABLE_HINT[payos.unavailableReason]}</span> : null}
                </div>
              )}
            </div>
          </PermissionGate>
        </CardContent>
      </Card>

      {liveTopup ? <ActiveTopupCard key={liveTopup.id} topup={liveTopup} /> : null}

      {w.pendingDeposit ? (
        <Card size="sm">
          <CardContent className="text-sm">
            Khoản nộp cọc <b>{formatVnd(w.pendingDeposit.amount)}</b> (mã GD {w.pendingDeposit.transferRef}) gửi trước đây vẫn đang chờ sàn đối chiếu và duyệt.
          </CardContent>
        </Card>
      ) : null}

      <Card size="sm">
        <CardContent className="flex items-start gap-3">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-muted-foreground">
            <li>Chỉ khi ví đặt cọc <b className="text-foreground">lớn hơn 0</b>, khách mới chọn được thanh toán khi nhận hàng (COD) cho sản phẩm của bạn.</li>
            <li>Mỗi đơn COD giao thành công, sàn <b className="text-foreground">tự trừ hoa hồng của đơn</b> khỏi ví. Ví về 0 hoặc âm thì COD đóng cho đơn mới (đơn đang giao không bị huỷ).</li>
            <li>Ví âm là khoản bạn còn nợ sàn: lần nạp tiền tiếp theo sẽ <b className="text-foreground">trừ nợ trước</b>, phần còn dư mới mở lại COD.</li>
            <li>Tối thiểu {formatVnd(w.minDeposit)} mỗi lần.</li>
            {payosOn ? <li>Nạp tiền vào ví: ví được cộng ngay khi nhận được tiền, không cần chờ sàn duyệt.</li> : null}
          </ul>
        </CardContent>
      </Card>

      <FilterTabs
        tabs={[
          { key: "tx", label: "Lịch sử ví" },
          { key: "topups", label: "Lịch sử nạp tiền" },
        ]}
        value={tab}
        onChange={(v) => setTab(v as "tx" | "topups")}
      />
      {tab === "tx" ? <TransactionsTable /> : <MyTopupsTable />}
      {topupOpen && payos ? <TopupDialog minAmount={payos.minAmount} maxAmount={payos.maxAmount} onClose={() => setTopupOpen(false)} /> : null}
    </div>
  );
}

function TransactionsTable() {
  const [pageIndex, setPageIndex] = useState(0);
  const { data, isLoading } = useMyWalletTransactions(pageIndex + 1, PAGE_SIZE);
  const columns: ColumnDef<WalletTransaction>[] = useMemo(
    () => [
      { id: "at", header: "Thời gian", cell: ({ row }) => <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(row.original.createdAt)}</span> },
      { id: "type", header: "Loại", cell: ({ row }) => SHOP_TX_LABEL[row.original.type] ?? row.original.type },
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
