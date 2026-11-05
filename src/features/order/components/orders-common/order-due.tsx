import { ClockIcon } from "lucide-react";
import { formatDateTime, formatRemaining } from "@/lib/format";
import { cn } from "@/lib/utils";
import { pendingDue } from "@/features/order/types/order";

/* Còn dưới 12 giờ (hoặc đã quá hạn) thì nổi bật: shop sắp bị tính vi phạm / đơn sắp bị tự huỷ nếu SLA đang bật. */
const URGENT_MS = 12 * 60 * 60_000;

/*
 * Một mốc hạn của đơn (`confirmDueAt` / `shipDueAt` do backend tính — FE KHÔNG tự suy hạn) dạng đếm ngược. `now` truyền từ trên xuống
 * (useNow) để cả bảng dùng chung một timer. Quá hạn tô ĐỎ; còn dưới 12 giờ tô cam. `compact` = một ô bảng / thẻ, không compact = một dòng
 * trong khung "việc cần làm".
 */
export function OrderDue({ label, dueAt, now, compact = false }: { label: string; dueAt?: string | null; now: number; compact?: boolean }) {
  const due = dueAt ? new Date(dueAt).getTime() : NaN;
  if (!dueAt || Number.isNaN(due)) return compact ? <span className="text-muted-foreground">—</span> : null;

  const remaining = due - now;
  const overdue = remaining <= 0;
  const urgent = remaining <= URGENT_MS;
  // formatRemaining(≤ 0) trả "Đã quá hạn" — đảo dấu để hiện thời gian đã trễ ("Quá hạn 5 giờ 3 phút").
  const text = overdue ? `Quá hạn ${formatRemaining(-remaining)}` : `Còn ${formatRemaining(remaining)}`;
  const tone = overdue ? "font-semibold text-destructive" : urgent ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground";

  if (compact) {
    return (
      <span className="flex flex-col leading-tight" title={`${label}: ${formatDateTime(dueAt)}`}>
        <span className={cn("whitespace-nowrap text-xs", tone)}>{text}</span>
        <span className="whitespace-nowrap text-[11px] text-muted-foreground">{label}</span>
      </span>
    );
  }

  return (
    <p className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm", tone)}>
      <ClockIcon className="size-4 shrink-0" />
      <span>{label}:</span>
      <b>{text.charAt(0).toLowerCase() + text.slice(1)}</b>
      <span className="text-xs font-normal">(hết hạn lúc {formatDateTime(dueAt)})</span>
    </p>
  );
}

/* Chọn mốc hạn theo trạng thái đơn (xem `pendingDue`): chờ xác nhận → hạn xác nhận, xác nhận / đóng gói → hạn giao, còn lại "—". */
export function OrderDueByStatus({
  order,
  now,
  compact = false,
}: {
  order: { status: string; confirmDueAt?: string | null; shipDueAt?: string | null };
  now: number;
  compact?: boolean;
}) {
  const due = pendingDue(order);
  if (!due) return compact ? <span className="text-muted-foreground">—</span> : null;
  return <OrderDue label={due.label} dueAt={due.at} now={now} compact={compact} />;
}
