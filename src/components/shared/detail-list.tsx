import { cn } from "@/lib/utils";

/*
 * Danh sách nhãn – giá trị (dl) cho màn chi tiết đơn, giao dịch, người dùng…
 * Một khuôn cho mọi màn: nhãn xám nhỏ bên trái, giá trị bên phải, xuống dòng
 * ở mobile.
 */
export interface DetailRow {
  label: string;
  value: React.ReactNode;
}

export function DetailList({ rows, className }: { rows: DetailRow[]; className?: string }) {
  return (
    <dl className={cn("grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[minmax(8rem,auto)_1fr]", className)}>
      {rows.map((r) => (
        <div key={r.label} className="contents">
          <dt className="text-muted-foreground">{r.label}</dt>
          <dd className="min-w-0 break-words font-medium">{r.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
