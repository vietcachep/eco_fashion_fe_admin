import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/*
 * Thẻ số liệu (KPI) dùng cho dashboard, báo cáo, đầu màn danh sách. Cùng một
 * khuôn ở mọi nơi: nhãn nhỏ, số to, dòng phụ, icon phải. `loading` render
 * skeleton cùng kích thước để dữ liệu về không giật bố cục.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  loading = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
  loading?: boolean;
  className?: string;
}) {
  const toneClass = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
  }[tone];

  return (
    <Card className={cn("gap-0 py-0", className)}>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-24 rounded" />
          ) : (
            <p className="mt-1 truncate font-heading text-2xl font-semibold tracking-tight">{value}</p>
          )}
          {hint !== undefined ? (
            loading ? (
              <Skeleton className="mt-2 h-3.5 w-32 rounded" />
            ) : (
              <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
            )
          ) : null}
        </div>
        {Icon ? (
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", toneClass)}>
            <Icon className="size-4.5" />
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
