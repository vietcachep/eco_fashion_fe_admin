import { ClockIcon } from "lucide-react";
import { formatDateTime, formatRemaining } from "@/lib/format";
import { RETURN_DEADLINE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

/* Còn dưới 12 giờ (hoặc đã quá hạn) thì đỏ: bước tiếp theo sắp bị hệ thống chuyển, người phụ trách cần xử lý ngay. */
const DEADLINE_URGENT_MS = 12 * 60 * 60_000;

/*
 * Hạn của bước đang chờ (`deadlineAt` + `deadlineKind` do backend tính — FE KHÔNG tự suy hạn). `now` truyền từ trên xuống (useNow)
 * để cả bảng dùng chung một timer. Yêu cầu đã kết thúc backend trả `deadlineAt = null` → compact hiện "—", đầy đủ không hiện gì.
 */
export function ReturnDeadline({
  deadlineAt,
  deadlineKind,
  now,
  compact = false,
}: {
  deadlineAt?: string | null;
  deadlineKind?: string | null;
  now: number;
  compact?: boolean;
}) {
  const due = deadlineAt ? new Date(deadlineAt).getTime() : NaN;
  if (!deadlineAt || Number.isNaN(due)) {
    return compact ? <span className="text-muted-foreground">—</span> : null;
  }

  const remaining = due - now;
  const urgent = remaining <= DEADLINE_URGENT_MS;
  const overdue = remaining <= 0;

  if (compact) {
    return (
      <span className={cn("whitespace-nowrap text-xs", urgent ? "font-semibold text-destructive" : "text-muted-foreground")} title={`${formatDateTime(deadlineAt)}`}>
        {overdue ? "Đã quá hạn" : `Còn ${formatRemaining(remaining)}`}
      </span>
    );
  }

  return (
    <p className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm", urgent ? "font-medium text-destructive" : "text-muted-foreground")}>
      <ClockIcon className="size-4 shrink-0" />
      <span>{(deadlineKind && RETURN_DEADLINE_LABEL[deadlineKind]) || "Hạn xử lý"}:</span>
      <b>{overdue ? "đã quá hạn" : `còn ${formatRemaining(remaining)}`}</b>
      <span className="text-xs font-normal">(hết hạn lúc {formatDateTime(deadlineAt)})</span>
    </p>
  );
}
