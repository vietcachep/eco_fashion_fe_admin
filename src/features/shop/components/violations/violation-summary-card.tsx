import { ShieldAlertIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import type { ShopViolationSummaryResponse } from "@/lib/api/generated/model";

/*
 * Thẻ tổng hợp điểm vi phạm: "x/ngưỡng điểm trong N ngày gần nhất" + thanh tiến độ tới ngưỡng. Dùng chung cổng vendor
 * (`audience = "vendor"`: lời nhắc cho chủ shop) và tab "Vi phạm" ở chi tiết shop của sàn (`audience = "platform"`: gợi ý cho quản lý).
 * Ngưỡng chỉ là mốc NHẮC quản lý xem xét khoá — backend không tự khoá shop — nên lời lẽ nói "có thể xem xét khoá", không "sẽ bị khoá".
 */
type Level = { tone: StatusTone; label: string; bar: string };

function levelOf(points: number, threshold: number, audience: "vendor" | "platform"): Level {
  if (threshold > 0 && points >= threshold) {
    return {
      tone: "danger",
      label: audience === "vendor" ? "Đã chạm ngưỡng — sàn có thể xem xét khoá gian hàng" : "Đã chạm ngưỡng — cân nhắc khoá gian hàng",
      bar: "bg-red-500",
    };
  }
  if (threshold > 0 && points / threshold >= 0.6) return { tone: "warning", label: "Gần chạm ngưỡng", bar: "bg-amber-500" };
  if (points > 0) return { tone: "success", label: "Trong giới hạn an toàn", bar: "bg-emerald-500" };
  return { tone: "success", label: "Chưa có điểm vi phạm", bar: "bg-emerald-500" };
}

export function ViolationSummaryCard({
  summary,
  loading,
  audience,
}: {
  summary?: ShopViolationSummaryResponse;
  loading: boolean;
  audience: "vendor" | "platform";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlertIcon className="size-4 text-muted-foreground" />
          Điểm vi phạm xử lý đơn
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {loading || !summary ? (
          <>
            <Skeleton className="h-9 w-56 rounded" />
            <Skeleton className="h-2.5 w-full rounded-full" />
            <Skeleton className="h-4 w-full max-w-md rounded" />
          </>
        ) : (
          <SummaryBody summary={summary} audience={audience} />
        )}
      </CardContent>
    </Card>
  );
}

function SummaryBody({ summary, audience }: { summary: ShopViolationSummaryResponse; audience: "vendor" | "platform" }) {
  const { points, threshold, windowDays } = summary;
  const level = levelOf(points, threshold, audience);
  const percent = threshold > 0 ? Math.min(100, Math.round((points / threshold) * 100)) : 0;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <p className="font-heading text-3xl leading-none font-semibold tabular-nums">
          {points}
          <span className="text-xl text-muted-foreground">/{threshold}</span>
          <span className="pl-2 text-sm font-normal text-muted-foreground">điểm trong {windowDays} ngày gần nhất</span>
        </p>
        <StatusBadge tone={level.tone}>{level.label}</StatusBadge>
      </div>
      <div
        role="progressbar"
        aria-label="Điểm vi phạm so với ngưỡng"
        aria-valuemin={0}
        aria-valuemax={threshold}
        aria-valuenow={Math.min(points, threshold)}
        className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className={cn("h-full rounded-full transition-[width]", level.bar)} style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        {audience === "vendor"
          ? `Điểm chỉ tính trong ${windowDays} ngày gần nhất và tự giảm khi vi phạm cũ quá hạn. Đạt ${threshold} điểm, quản lý sàn sẽ được nhắc xem xét khoá gian hàng.`
          : `Tổng điểm ${windowDays} ngày gần nhất. Đạt ${threshold} điểm hệ thống nhắc quản lý xem xét khoá gian hàng (tối đa 1 lần / 7 ngày); việc khoá do con người quyết định.`}
      </p>
    </>
  );
}
