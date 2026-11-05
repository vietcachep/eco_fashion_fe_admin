"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2Icon, Clock3Icon, Loader2Icon, RefreshCwIcon, TriangleAlertIcon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { PermissionGate } from "@/components/shared/permission-gate";
import { apiErrorMessage, apiStatus, isForbiddenError } from "@/lib/api-error";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDateTime, formatVnd } from "@/lib/format";
import { useMyTopupByOrderCode } from "@/features/shop/hooks/use-wallet-topups";
import { OPEN_TOPUP_STATUSES } from "@/features/shop/types/wallet-topup";

/* Khớp cửa sổ hỏi lại của useMyTopupByOrderCode (180 giây). Hết cửa sổ thì hook ngừng hỏi và màn chuyển sang lời "chưa nhận được". */
const WAIT_WINDOW_MS = 180_000;

/* Mã PayOS chỉ gồm chữ số (backend: ^\d{1,16}$). */
const ORDER_CODE_RE = /^\d{1,16}$/;

/*
 * Trang PayOS đưa khách quay về sau khi thanh toán hoặc huỷ (PLAN-0041 D11). Kết luận CHỈ lấy từ backend: `status`/`cancel` trên URL
 * ai cũng gõ được. `daHuy` chỉ dùng để KHÔNG hiện "đang chờ" khi backend chưa kịp ghi nhận mà khách đã chủ động rời cổng (như storefront).
 * Khoản đang mở thì hook hỏi lại 3 giây/lần tới 180 giây; sau đó màn báo "chưa nhận được" và job đối soát phía backend tự dò PayOS.
 */
export function TopupReturnScreen({ orderCode, daHuy }: { orderCode: string | null; daHuy: boolean }) {
  // Mã sai định dạng thì KHÔNG gọi API, để chuỗi lạ không đi vào đường dẫn.
  const code = orderCode && ORDER_CODE_RE.test(orderCode) ? orderCode : null;
  const q = useMyTopupByOrderCode(code);
  const waitedOut = useWaitedOut();

  if (!code) {
    return (
      <ResultCard
        icon={<TriangleAlertIcon className="size-5 text-amber-600" />}
        title="Thiếu thông tin giao dịch"
        body={<p>Đường dẫn quay về không kèm mã giao dịch hợp lệ. Bạn kiểm tra lại số dư trong ví đặt cọc nhé.</p>}
      >
        <WalletLink label="Về ví đặt cọc" />
      </ResultCard>
    );
  }

  if (q.isError) {
    if (isForbiddenError(q.error)) return <ApiErrorState error={q.error} fallback="Không tải được kết quả nạp cọc." />;
    if (apiStatus(q.error) === 404) {
      return (
        <ResultCard
          icon={<TriangleAlertIcon className="size-5 text-amber-600" />}
          title="Không tìm thấy khoản nạp này"
          body={<p>{apiErrorMessage(q.error, "Mã giao dịch không khớp với khoản nạp của gian hàng bạn.")}</p>}
        >
          <WalletLink label="Về ví đặt cọc" />
        </ResultCard>
      );
    }
    return (
      <ResultCard
        icon={<TriangleAlertIcon className="size-5 text-amber-600" />}
        title="Chưa xác nhận được khoản nạp"
        body={
          <p>
            {apiErrorMessage(q.error, "Không kết nối được máy chủ.")} Nếu bạn đã chuyển tiền, ví sẽ tự cập nhật trong ít phút.
          </p>
        }
      >
        <RetryButton onRetry={() => void q.refetch()} busy={q.isFetching} />
        <WalletLink label="Về ví đặt cọc" />
      </ResultCard>
    );
  }

  if (!q.data) return <ReturnSkeleton />;

  const data = q.data;
  const hasReceived = Number(data.receivedAmount) > 0;
  const open = OPEN_TOPUP_STATUSES.includes(data.status);
  // Khách đã bấm huỷ ở PayOS: coi là huỷ cả khi backend còn ghi "đang chờ" nhưng chưa có tiền nào.
  const cancelledByUser = data.status === "cancelled" || (daHuy && open && !hasReceived);
  const checkoutUrl = data.checkoutUrl;
  const openCheckout = () => {
    if (checkoutUrl) window.location.assign(checkoutUrl);
  };

  if (data.status === "paid") {
    // So sánh hai chuỗi số để biết có chuyển thừa; không tính hiệu số tiền ở giao diện.
    const overpaid = Number(data.receivedAmount) > Number(data.amount);
    return (
      <ResultCard
        icon={<CheckCircle2Icon className="size-5 text-emerald-600" />}
        title="Nạp cọc thành công"
        body={
          <>
            <p>
              Đã ghi có <b className="text-foreground">{formatVnd(data.receivedAmount)}</b> vào ví đặt cọc.
            </p>
            {overpaid ? <p>Bạn đã chuyển thừa so với số tiền yêu cầu — phần thừa cũng đã nằm trong ví.</p> : null}
          </>
        }
      >
        <WalletLink label="Về ví đặt cọc" primary />
      </ResultCard>
    );
  }

  if (data.status === "partial") {
    return (
      <ResultCard
        icon={<Clock3Icon className="size-5 text-amber-600" />}
        title={`Đã nhận một phần ${formatVnd(data.receivedAmount)} / ${formatVnd(data.amount)}`}
        body={<p>Thanh toán còn hiệu lực đến {formatDateTime(data.expiresAt)}: thanh toán nốt phần còn lại.</p>}
      >
        {checkoutUrl ? (
          <PermissionGate permission={PERMISSIONS.shopWalletDepositRequest}>
            <Button onClick={openCheckout}>Mở lại trang thanh toán</Button>
          </PermissionGate>
        ) : null}
        <WalletLink label="Về ví đặt cọc" />
      </ResultCard>
    );
  }

  if (cancelledByUser) {
    return (
      <ResultCard
        icon={<XCircleIcon className="size-5 text-muted-foreground" />}
        title="Bạn đã huỷ thanh toán"
        body={
          hasReceived ? (
            <p>Số tiền đã nhận {formatVnd(data.receivedAmount)} đã được ghi có vào ví.</p>
          ) : (
            <p>Chưa có khoản tiền nào được ghi nhận cho lần nạp này.</p>
          )
        }
      >
        <WalletLink label="Nạp lại" primary />
      </ResultCard>
    );
  }

  if (open) {
    // Đang chờ: hỏi lại tự động trong 180 giây; quá mốc này thì để người dùng tự bấm kiểm tra, còn đối soát do backend làm.
    if (!waitedOut) {
      return (
        <ResultCard
          icon={<Loader2Icon className="size-5 animate-spin text-muted-foreground" />}
          title="Đang chờ xác nhận thanh toán…"
          body={<p>Trang này tự cập nhật khi nhận được xác nhận thanh toán.</p>}
        >
          <WalletLink label="Về ví đặt cọc" />
        </ResultCard>
      );
    }
    return (
      <ResultCard
        icon={<Clock3Icon className="size-5 text-amber-600" />}
        title="Chưa nhận được tiền"
        body={<p>Chưa nhận được tiền. Nếu bạn đã thanh toán, ví sẽ tự cập nhật trong ít phút.</p>}
      >
        <RetryButton onRetry={() => void q.refetch()} busy={q.isFetching} />
        <WalletLink label="Về ví đặt cọc" />
      </ResultCard>
    );
  }

  if (data.status === "expired") {
    return (
      <ResultCard
        icon={<TriangleAlertIcon className="size-5 text-muted-foreground" />}
        title="Lần nạp đã hết hạn"
        body={
          hasReceived ? (
            <p>Đã ghi có {formatVnd(data.receivedAmount)} vào ví trước khi lần nạp hết hạn.</p>
          ) : (
            <p>Lần nạp này đã đóng. Bạn có thể nạp lại.</p>
          )
        }
      >
        <WalletLink label="Nạp lại" primary />
      </ResultCard>
    );
  }

  if (data.status === "failed") {
    return (
      <ResultCard
        icon={<XCircleIcon className="size-5 text-destructive" />}
        title="Chưa tạo được lần nạp"
        body={
          <p>
            Lần nạp này chưa tạo được trang thanh toán.{" "}
            {hasReceived ? `Tuy vậy đã có tiền về muộn: ${formatVnd(data.receivedAmount)} đã được ghi có vào ví.` : "Bạn có thể thử nạp lại."}
          </p>
        }
      >
        <WalletLink label="Nạp lại" primary />
      </ResultCard>
    );
  }

  // Trạng thái lạ (backend thêm mã mới): không trang trắng, chỉ đưa người dùng về ví.
  return (
    <ResultCard icon={<Clock3Icon className="size-5 text-muted-foreground" />} title="Đang xử lý" body={<p>Kiểm tra lại trong ví đặt cọc.</p>}>
      <WalletLink label="Về ví đặt cọc" />
    </ResultCard>
  );
}

/* Đánh dấu đã chờ hết cửa sổ hỏi lại. Chỉ đổi state trong callback của timer, không đổi trong thân effect. */
function useWaitedOut(): boolean {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setDone(true), WAIT_WINDOW_MS);
    return () => clearTimeout(timer);
  }, []);
  return done;
}

/* Khung kết quả dùng chung cho mọi trạng thái; children là các nút hành động. */
function ResultCard({ icon, title, body, children }: { icon: React.ReactNode; title: string; body?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <Card className="w-full max-w-lg">
      <CardContent className="flex flex-col items-start gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-base font-semibold">{title}</h2>
        </div>
        {body ? <div className="flex flex-col gap-1 text-sm text-muted-foreground">{body}</div> : null}
        {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
      </CardContent>
    </Card>
  );
}

/* Khung chờ khớp bố cục ResultCard (tiêu đề, dòng mô tả, một nút). */
function ReturnSkeleton() {
  return (
    <div className="flex w-full max-w-lg flex-col gap-2">
      <p className="text-sm text-muted-foreground">Đang xác nhận khoản nạp…</p>
      <Card>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-full max-w-sm" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </CardContent>
      </Card>
    </div>
  );
}

function WalletLink({ label, primary = false }: { label: string; primary?: boolean }) {
  return (
    <Button nativeButton={false} variant={primary ? "default" : "outline"} render={<Link href={ROUTES.vendor.wallet} />}>
      {label}
    </Button>
  );
}

function RetryButton({ onRetry, busy }: { onRetry: () => void; busy: boolean }) {
  return (
    <Button variant="outline" onClick={onRetry} disabled={busy}>
      {busy ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
      Kiểm tra lại
    </Button>
  );
}
