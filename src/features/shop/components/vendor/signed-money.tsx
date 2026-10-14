import { formatVnd } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
 * Số tiền VND có dấu và màu theo chiều dòng tiền: âm đỏ, dương xanh, 0 xám. Dùng cho sổ cái ví quỹ và các dòng đối
 * soát — nơi dấu +/− quan trọng hơn bản thân con số (backend trả chuỗi số nguyên, âm = trừ).
 */
export function SignedMoney({ value, showPlus = true, className }: { value: string | number | null | undefined; showPlus?: boolean; className?: string }) {
  const n = typeof value === "string" ? Number(value) : value;
  if (n === null || n === undefined || !Number.isFinite(n)) return <span className="text-muted-foreground">—</span>;
  const tone = n < 0 ? "text-destructive" : n > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground";
  return (
    <span className={cn("whitespace-nowrap font-medium tabular-nums", tone, className)}>
      {n > 0 && showPlus ? "+" : ""}
      {formatVnd(n)}
    </span>
  );
}
