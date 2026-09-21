import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/*
 * Status badge for ERP documents and system states.
 * Maps a status tone to a consistent color so every screen renders
 * statuses the same way (draft/pending/approved/rejected/cancelled...).
 */
export type StatusTone =
  | "neutral"
  | "pending"
  | "success"
  | "danger"
  | "warning";

const toneClasses: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  pending: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  success:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  danger: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

export function StatusBadge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: StatusTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Badge variant="secondary" className={cn(toneClasses[tone], className)}>
      {children}
    </Badge>
  );
}
