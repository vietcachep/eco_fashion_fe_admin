import { StatusBadge } from "@/components/shared/status-badge";
import type { RefundResponse } from "@/lib/api/generated/model";
import { REFUND_GATEWAY_STATUS, REFUND_PAYEE_SOURCE_LABEL, REFUND_STATUS, statusMeta } from "@/lib/labels";
import { bankNameByBin } from "@/features/shop/types/bank-list";

/* PayOS đã nhận lệnh chi nhưng chưa báo kết quả cuối: khoản vẫn `processing`, KHÔNG phải đã hoàn xong. */
export function isAwaitingGateway(r: Pick<RefundResponse, "status" | "gatewayStatus" | "providerRef">): boolean {
  return r.status === "processing" && !r.providerRef && (r.gatewayStatus === "submitted" || r.gatewayStatus === "processing");
}

/*
 * Trạng thái khoản hoàn nhìn từ kế toán: trạng thái nội bộ + lệnh chi PayOS (`gatewayStatus`) + cờ cần xử lý tay.
 * "Đang xử lý" mà PayOS đã nhận lệnh thì nói thẳng "Đang chờ PayOS xác nhận" — tránh hiểu nhầm là đã chuyển tiền.
 */
export function RefundStatusCell({ refund: r }: { refund: RefundResponse }) {
  const m = statusMeta(REFUND_STATUS, r.status);
  const gateway = r.gatewayStatus ? statusMeta(REFUND_GATEWAY_STATUS, r.gatewayStatus) : null;
  return (
    <div className="flex flex-col items-start gap-1">
      <StatusBadge tone={m.tone}>{m.label}</StatusBadge>
      {isAwaitingGateway(r) ? (
        <span className="text-xs text-blue-700 dark:text-blue-300">Đang chờ PayOS xác nhận</span>
      ) : gateway ? (
        <span className="text-xs text-muted-foreground">{gateway.label}</span>
      ) : null}
      {r.needsManual ? <StatusBadge tone="warning">Cần chuyển tay</StatusBadge> : null}
      {r.needsReconcile ? (
        <>
          <StatusBadge tone="warning">Cần đối chiếu</StatusBadge>
          {/* PLAN-0040 AUD-14: lệnh PayOS không rõ kết quả — PayOS có thể ĐÃ chi, chuyển tay ngay sẽ khiến khách nhận hai lần. */}
          <span className="max-w-48 text-xs text-amber-700 dark:text-amber-300">PayOS không rõ kết quả — đối soát theo lệnh PayOS trước khi chuyển tay.</span>
        </>
      ) : null}
    </div>
  );
}

/* Gian hàng của khoản hoàn: backend trả kèm `shopName`/`shopCode` (kế toán không có quyền đọc shop). Khoản trả trùng / tiền lệch không thuộc shop nào. */
export function RefundShopCell({ refund: r }: { refund: Pick<RefundResponse, "shopId" | "shopName" | "shopCode"> }) {
  if (!r.shopName && !r.shopCode) {
    return <span className="text-sm text-muted-foreground">{r.shopId ? `Shop …${r.shopId.slice(0, 8)}` : "Không thuộc shop"}</span>;
  }
  return (
    <div className="flex flex-col leading-tight">
      <span className="font-medium">{r.shopName ?? r.shopCode}</span>
      {r.shopName && r.shopCode ? <span className="font-mono text-xs text-muted-foreground">{r.shopCode}</span> : null}
    </div>
  );
}

/* Tài khoản nhận hoàn (đã che số) + nguồn của nó. Nút "Xem số TK" do nơi gọi chèn qua `children` (cần quyền riêng). */
export function RefundPayeeCell({ refund: r, children }: { refund: RefundResponse; children?: React.ReactNode }) {
  if (!r.payee) {
    return (
      <div className="flex flex-col items-start gap-1">
        <span className="text-sm text-muted-foreground">Chưa có tài khoản</span>
        <StatusBadge tone={r.needsManual ? "warning" : "neutral"}>{REFUND_PAYEE_SOURCE_LABEL[r.payeeSource] ?? REFUND_PAYEE_SOURCE_LABEL.none}</StatusBadge>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1 leading-tight">
      <span className="font-mono text-sm">{r.payee.accountNumberMasked}</span>
      <span className="max-w-48 truncate text-xs text-muted-foreground" title={r.payee.accountName}>
        {r.payee.accountName || "—"} · {bankNameByBin(r.payee.bankBin) ?? `BIN ${r.payee.bankBin}`}
      </span>
      <StatusBadge tone="neutral">{REFUND_PAYEE_SOURCE_LABEL[r.payeeSource] ?? r.payeeSource}</StatusBadge>
      {children}
    </div>
  );
}
