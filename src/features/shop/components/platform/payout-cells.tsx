import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { formatDate, formatVnd } from "@/lib/format";
import { SHOP_PAYOUT_STATUS, statusMeta } from "@/lib/labels";

/* Ô hiển thị dùng chung cho bảng kỳ đối soát và khung chi tiết kỳ. */

export function PayoutStatusBadge({ status }: { status: string }) {
  const meta = statusMeta(SHOP_PAYOUT_STATUS, status);
  return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
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
