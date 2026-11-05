import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { formatDate, formatVnd } from "@/lib/format";
import { PAYOUT_GATEWAY_STATUS, SHOP_PAYOUT_STATUS, statusMeta } from "@/lib/labels";
import type { ShopPayoutResponse } from "@/lib/api/generated/model";

/* Ô hiển thị dùng chung cho bảng kỳ đối soát và khung chi tiết kỳ. */

export function PayoutStatusBadge({ status }: { status: string }) {
  const meta = statusMeta(SHOP_PAYOUT_STATUS, status);
  return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}

/* Kết quả lệnh chi PayOS của kỳ (`gatewayStatus`); null = chưa gửi lệnh / chi tay nên không có gì để hiện. */
export function PayoutGatewayBadge({ gatewayStatus }: { gatewayStatus: string | null }) {
  if (!gatewayStatus) return null;
  const meta = statusMeta(PAYOUT_GATEWAY_STATUS, gatewayStatus);
  return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}

/*
 * Tên gian hàng của kỳ: backend trả kèm `shopName` + `shopCode` (kế toán không có quyền đọc shop nên không thể tự tra). Thiếu cả hai
 * (kỳ cũ / shop đã xoá) thì còn mã rút gọn để vẫn phân biệt được các dòng.
 */
export function payoutShopLabel(p: Pick<ShopPayoutResponse, "shopId" | "shopName" | "shopCode">): string {
  if (p.shopName) return p.shopCode ? `${p.shopName} (${p.shopCode})` : p.shopName;
  return p.shopCode ?? `Shop …${p.shopId.slice(0, 8)}`;
}

export function PayoutShopCell({ payout }: { payout: Pick<ShopPayoutResponse, "shopId" | "shopName" | "shopCode"> }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="font-medium">{payout.shopName ?? payout.shopCode ?? `Shop …${payout.shopId.slice(0, 8)}`}</span>
      {payout.shopName && payout.shopCode ? <span className="font-mono text-xs text-muted-foreground">{payout.shopCode}</span> : null}
    </div>
  );
}

/* Thực chi = gross − hoa hồng − hoàn − nợ mang sang; ÂM = shop còn nợ sàn (mang sang kỳ sau) nên tô đỏ. */
export function NetPayoutAmount({ value, className }: { value: string; className?: string }) {
  return <span className={cn("font-semibold tabular-nums", Number(value) < 0 && "text-destructive", className)}>{formatVnd(value)}</span>;
}

export function PayoutPeriod({ start, end }: { start: string; end: string }) {
  return (
    <span className="text-xs text-muted-foreground">
      {formatDate(start)} → {formatDate(end)}
    </span>
  );
}
