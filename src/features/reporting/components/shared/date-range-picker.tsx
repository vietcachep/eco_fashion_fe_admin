"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toDayString } from "@/lib/format";

export interface DateRange {
  from: string;
  to: string;
}

/* Mặc định: đầu tháng hiện tại → hôm nay (khớp mặc định backend). */
export function defaultRange(): DateRange {
  const today = new Date();
  return { from: `${toDayString(today).slice(0, 7)}-01`, to: toDayString(today) };
}

function shift(days: number): DateRange {
  const to = new Date();
  const from = new Date(Date.now() - days * 86_400_000);
  return { from: toDayString(from), to: toDayString(to) };
}

/* Hai ô ngày + nút chọn nhanh (7 / 30 / 90 ngày, tháng này) dùng cho mọi báo cáo theo kỳ. */
export function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (v: DateRange) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input type="date" aria-label="Từ ngày" className="w-40" value={value.from} max={value.to} onChange={(e) => onChange({ ...value, from: e.target.value })} />
      <span className="text-sm text-muted-foreground">→</span>
      <Input type="date" aria-label="Đến ngày" className="w-40" value={value.to} min={value.from} onChange={(e) => onChange({ ...value, to: e.target.value })} />
      <div className="flex gap-1">
        {[
          { label: "7 ngày", range: () => shift(6) },
          { label: "30 ngày", range: () => shift(29) },
          { label: "90 ngày", range: () => shift(89) },
          { label: "Tháng này", range: defaultRange },
        ].map((q) => (
          <Button key={q.label} type="button" variant="outline" size="sm" className="h-8" onClick={() => onChange(q.range())}>
            {q.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
