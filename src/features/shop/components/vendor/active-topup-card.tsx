"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { apiErrorMessage } from "@/lib/api-error";
import { PERMISSIONS } from "@/lib/constants";
import { formatDateTime, formatRemaining, formatVnd } from "@/lib/format";
import { statusMeta, TOPUP_STATUS } from "@/lib/labels";
import { invalidateByPath } from "@/lib/query-invalidate";
import { useCancelTopup, useMyTopup } from "@/features/shop/hooks/use-wallet-topups";
import { OPEN_TOPUP_STATUSES } from "@/features/shop/types/wallet-topup";
import type { WalletTopup } from "@/features/shop/types/wallet-topup";

/* Tiền tố truy vấn ví của shop. Trùng hằng SHOP_PATH trong hook (hook không export); dùng để làm mới ví khi khoản đã chốt. */
const SHOP_WALLET_PATH = "/api/v1/shop/wallet";

/* Chu kỳ nhích "bây giờ": hạn link tính bằng phút/giờ nên 30 giây là đủ, và không mở timer cho từng thẻ. */
const NOW_TICK_MS = 30_000;

/*
 * "Bây giờ" cho đếm ngược hạn link. Render không được gọi Date.now() trực tiếp (không thuần), nên mốc giữ trong state và nhích theo chu kỳ.
 * Viết cục bộ thay vì import từ feature order: feature không được import internals của feature khác (AGENTS.md).
 */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), NOW_TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/*
 * Khoản còn "sống" ở giao diện: trạng thái mở VÀ chưa quá hạn theo đồng hồ máy. Quá hạn mà job backend chưa quét thì coi như hết:
 * thẻ ẩn và nút nạp mở lại (backend khi tạo link mới cũng tự đóng khoản quá hạn — PLAN-0041 D6). Hạn không đọc được ⇒ không coi là sống.
 */
export function isLiveTopup(topup: WalletTopup | null | undefined, now: number): topup is WalletTopup {
  if (!topup) return false;
  return OPEN_TOPUP_STATUSES.includes(topup.status) && new Date(topup.expiresAt).getTime() > now;
}

/*
 * Thẻ "link nạp đang chờ" trên màn ví: cho mở lại trang PayOS, kiểm tra lại với backend, và huỷ link.
 * Thẻ hỏi lại khoản khi hiện (backend hỏi PayOS nếu còn mở) nên trạng thái ở đây gần đúng nhất; khoản đã chốt thì thẻ tự ẩn.
 */
export function ActiveTopupCard({ topup }: { topup: WalletTopup }) {
  const qc = useQueryClient();
  const now = useNow();
  const check = useMyTopup(topup.id);
  const cancel = useCancelTopup();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Ưu tiên kết quả vừa hỏi backend; chưa có thì dùng bản đang có trong ví.
  const current = check.data ?? topup;
  const fetchedStatus = check.data?.status;

  useEffect(() => {
    // Khoản vừa chốt (đã nhận / hết hạn / đã huỷ) mà thẻ còn trong ví ⇒ làm mới ví để thẻ biến mất và số dư đúng.
    if (fetchedStatus && !OPEN_TOPUP_STATUSES.includes(fetchedStatus)) invalidateByPath(qc, SHOP_WALLET_PATH);
  }, [fetchedStatus, qc]);

  if (!isLiveTopup(current, now)) return null;

  const meta = statusMeta(TOPUP_STATUS, current.status);
  const openCheckout = () => {
    if (current.checkoutUrl) window.location.assign(current.checkoutUrl);
  };

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-xs text-muted-foreground">Lần nạp đang chờ thanh toán</p>
            <p className="text-2xl font-semibold tabular-nums">{formatVnd(current.amount)}</p>
            {current.status === "partial" ? (
              <p className="text-sm">
                Đã nhận <b>{formatVnd(current.receivedAmount)}</b> / {formatVnd(current.amount)} — chuyển nốt phần còn lại trước khi hết hạn.
              </p>
            ) : null}
          </div>
          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
        </div>

        <p className="text-xs text-muted-foreground">
          Hết hạn sau <b className="text-foreground">{formatRemaining(new Date(current.expiresAt).getTime() - now)}</b> (
          {formatDateTime(current.expiresAt)}) · Mã giao dịch <span className="font-mono">{current.payosOrderCode}</span>
        </p>

        <div className="flex flex-wrap gap-2">
          {/* Thanh toán và huỷ là việc của người có quyền nạp (chủ shop); người chỉ có quyền đọc chỉ thấy trạng thái và kiểm tra lại. */}
          <PermissionGate permission={PERMISSIONS.shopWalletDepositRequest}>
            <Button onClick={openCheckout} disabled={!current.checkoutUrl}>
              Mở trang thanh toán
            </Button>
          </PermissionGate>
          <Button variant="outline" onClick={() => void check.refetch()} disabled={check.isFetching}>
            {check.isFetching ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
            Kiểm tra lại
          </Button>
          {current.canCancel ? (
            <PermissionGate permission={PERMISSIONS.shopWalletDepositRequest}>
              <Button variant="destructive" onClick={() => setConfirmOpen(true)} disabled={cancel.isPending}>
                Hủy lần nạp
              </Button>
            </PermissionGate>
          ) : null}
        </div>

        {check.isError ? (
          <p role="alert" className="text-xs text-destructive">
            {apiErrorMessage(check.error, "Chưa kiểm tra lại được khoản nạp. Thử lại sau ít phút.")}
          </p>
        ) : null}
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hủy lần nạp này?"
        description="Trang thanh toán của lần nạp này sẽ bị đóng, bạn không dùng trang đó để thanh toán nữa. Số tiền đã thanh toán trước đó (nếu có) vẫn được cộng vào ví."
        confirmLabel="Hủy lần nạp"
        destructive
        onConfirm={() => cancel.mutate(current.id)}
      />
    </Card>
  );
}
