"use client";

import { ClockIcon, LockIcon, LockOpenIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatVnd } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ShopWalletResponse } from "@/lib/api/generated/model";
import { useMyShopWallet } from "@/features/shop/hooks/use-shop-wallet";
import { DepositRequestButton } from "@/features/shop/components/vendor/deposit-request-dialog";
import { ShopWalletHistory } from "@/features/shop/components/vendor/shop-wallet-history";

const LOAD_ERROR = "Không tải được ví quỹ COD.";

/*
 * Ví quỹ COD của gian hàng CHÍNH MÌNH (GET /shop/wallet) + lịch sử. Với đơn COD, shop tự thu tiền mặt nên sàn thu hoa
 * hồng bằng cách TRỪ vào ví này khi đơn hoàn tất; ví ≤ 0 ⇒ backend khoá COD của shop. Trạng thái khoá lấy từ
 * `codEnabled` (backend là nguồn sự thật), số dư ≤ 0 chỉ để cảnh báo sớm.
 */
export function ShopWalletPanel() {
  const { data, isPending, error } = useMyShopWallet();

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-4">
      {isPending || !data ? <Skeleton className="h-52 w-full rounded-xl" /> : <WalletSummaryCard wallet={data} />}
      <ShopWalletHistory />
    </div>
  );
}

function WalletSummaryCard({ wallet }: { wallet: ShopWalletResponse }) {
  const balance = Number(wallet.balance);
  const locked = !wallet.codEnabled;
  const lowBalance = Number.isFinite(balance) && balance <= 0;
  const pending = wallet.pendingDeposit;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Số dư quỹ COD</p>
            <p className={cn("mt-1 font-heading text-3xl font-semibold tracking-tight tabular-nums", lowBalance && "text-destructive")}>
              {formatVnd(wallet.balance)}
            </p>
            <div className="mt-2">
              {locked ? (
                <StatusBadge tone="danger" className="gap-1">
                  <LockIcon className="size-3" />
                  COD đang bị khoá
                </StatusBadge>
              ) : (
                <StatusBadge tone="success" className="gap-1">
                  <LockOpenIcon className="size-3" />
                  COD đang bật
                </StatusBadge>
              )}
            </div>
          </div>
          <DepositRequestButton disabled={!!pending} />
        </div>

        {pending ? (
          <div role="status" className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            <ClockIcon className="mt-0.5 size-4 shrink-0" />
            <span>
              Yêu cầu nộp quỹ <b>{formatVnd(pending.amount)}</b> đang chờ sàn duyệt. Duyệt xong số tiền được cộng vào ví
              {locked ? " và COD được mở lại" : ""}. Trong lúc chờ bạn không gửi thêm yêu cầu khác được.
            </span>
          </div>
        ) : null}

        {locked ? (
          <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            {lowBalance
              ? "COD của shop đang bị khoá: ví quỹ đã hết nên khách không chọn được thanh toán khi nhận hàng ở gian hàng của bạn. Nộp thêm quỹ để mở lại."
              : "COD của shop đang bị khoá nên khách chưa chọn được thanh toán khi nhận hàng. Liên hệ bộ phận hỗ trợ nhà cung cấp để biết lý do."}
          </div>
        ) : lowBalance ? (
          <div role="status" className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            Số dư ví đã về 0 — COD sẽ bị khoá ngay khi có biến động ví tiếp theo. Hãy nộp thêm quỹ sớm để không gián đoạn bán COD.
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Cách hoạt động: với đơn COD, shop tự thu tiền mặt từ khách nên hoa hồng của sàn được trừ vào ví này khi đơn hoàn tất. Khi ví ≤ 0
          khách không chọn được COD ở shop bạn — nộp thêm quỹ (sàn duyệt) để mở lại. Đơn thanh toán online đi theo kỳ đối soát, không qua ví.
        </p>
      </CardContent>
    </Card>
  );
}
