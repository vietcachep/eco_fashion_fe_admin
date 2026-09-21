"use client";

import { cn } from "@/lib/utils";

/*
 * Dải nút lọc trạng thái trên đầu bảng (Tất cả / Chờ xác nhận / …). Dùng cho
 * mọi màn danh sách để các tab lọc trông và hành xử giống nhau. Giá trị "" =
 * không lọc. Thuần trình bày: nơi gọi giữ state và đặt lại trang về đầu.
 */
export interface FilterTab {
  key: string;
  label: string;
  /** Số lượng nhỏ bên phải nhãn (tuỳ chọn). */
  count?: number;
}

export function FilterTabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: readonly FilterTab[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} role="tablist">
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <button
            key={t.key || "all"}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cn(
              "h-8 rounded-lg border px-3 text-sm font-medium transition-colors",
              active
                ? "border-primary/60 bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t.label}
            {t.count !== undefined ? (
              <span className="ml-1.5 text-xs text-muted-foreground">{t.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
