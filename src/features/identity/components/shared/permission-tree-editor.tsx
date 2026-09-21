"use client";

import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePermissionCatalog } from "@/features/identity/hooks/use-admin-roles";
import type { PermissionResponse } from "@/lib/api/generated/model";

/*
 * Cây quyền theo MODULE (identity · catalog · product · …), dùng cho hai màn:
 *  - Vai: mỗi mã là bật/tắt (`value` = tập mã đã cấp).
 *  - Quyền riêng từng người: ba trạng thái theo vai / cấp / chặn — truyền
 *    `baseline` (mã vai đang có) để hiện nền, và `overrides` để tô màu.
 * Chỉ trình bày; nơi gọi giữ state và gọi API.
 */
export const MODULE_LABEL: Record<string, string> = {
  identity: "Người dùng & phân quyền",
  catalog: "Ngành hàng / bộ sưu tập / thuộc tính",
  product: "Sản phẩm & tồn kho",
  order: "Đơn hàng & đổi trả",
  payment: "Thanh toán & hoàn tiền",
  promotion: "Khuyến mãi",
  review: "Đánh giá",
  system: "Hệ thống",
  reporting: "Báo cáo",
  ai: "Trợ lý AI",
};

export type OverrideState = "inherit" | "allow" | "deny";

export function groupByModule(list: PermissionResponse[]) {
  const map = new Map<string, PermissionResponse[]>();
  for (const p of list) {
    if (!p.isActive) continue; // mã deprecated không cho cấp mới
    const arr = map.get(p.moduleCode) ?? [];
    arr.push(p);
    map.set(p.moduleCode, arr);
  }
  return [...map.entries()];
}

/* Chế độ vai: tập mã bật/tắt. */
export function RolePermissionTree({
  value,
  onChange,
  disabled = false,
}: {
  value: Set<string>;
  onChange: (next: Set<string>) => void;
  disabled?: boolean;
}) {
  const { data, isPending } = usePermissionCatalog();
  const groups = useMemo(() => groupByModule(data ?? []), [data]);

  if (isPending) return <TreeSkeleton />;

  const toggle = (code: string, checked: boolean) => {
    const next = new Set(value);
    if (checked) next.add(code);
    else next.delete(code);
    onChange(next);
  };
  const toggleModule = (codes: string[], checked: boolean) => {
    const next = new Set(value);
    for (const c of codes) if (checked) next.add(c);
    else next.delete(c);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {groups.map(([module, perms]) => {
        const codes = perms.map((p) => p.code);
        const on = codes.filter((c) => value.has(c)).length;
        return (
          <fieldset key={module} className="rounded-lg border">
            <legend className="ml-3 px-1 text-sm font-semibold">
              {MODULE_LABEL[module] ?? module}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                {on}/{codes.length}
              </span>
            </legend>
            <div className="flex flex-col gap-1 px-3 pb-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={on === codes.length}
                  indeterminate={on > 0 && on < codes.length}
                  disabled={disabled}
                  onCheckedChange={(c) => toggleModule(codes, c === true)}
                />
                Chọn cả nhóm
              </label>
              {perms.map((p) => (
                <label key={p.code} className="flex cursor-pointer items-start gap-2 py-0.5 text-sm">
                  <Checkbox
                    className="mt-0.5"
                    checked={value.has(p.code)}
                    disabled={disabled}
                    onCheckedChange={(c) => toggle(p.code, c === true)}
                  />
                  <span>
                    {p.description}
                    <code className="ml-1.5 rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {p.code}
                    </code>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

/* Chế độ quyền riêng: theo vai / cấp thêm / chặn. */
export function OverridePermissionTree({
  baseline,
  value,
  onChange,
  disabled = false,
}: {
  /** Mã mà VAI của người đó đang cấp (nền). */
  baseline: Set<string>;
  value: Map<string, OverrideState>;
  onChange: (code: string, state: OverrideState) => void;
  disabled?: boolean;
}) {
  const { data, isPending } = usePermissionCatalog();
  const groups = useMemo(() => groupByModule(data ?? []), [data]);

  if (isPending) return <TreeSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      {groups.map(([module, perms]) => (
        <fieldset key={module} className="rounded-lg border">
          <legend className="ml-3 px-1 text-sm font-semibold">{MODULE_LABEL[module] ?? module}</legend>
          <div className="flex flex-col gap-1 px-3 pb-3">
            {perms.map((p) => {
              const state = value.get(p.code) ?? "inherit";
              const fromRole = baseline.has(p.code);
              const effective = state === "allow" || (state === "inherit" && fromRole);
              return (
                <div
                  key={p.code}
                  className={cn(
                    "flex flex-wrap items-center gap-2 rounded-md px-2 py-1 text-sm",
                    state === "allow" && "bg-emerald-50",
                    state === "deny" && "bg-red-50",
                  )}
                >
                  <span className={cn("size-2 shrink-0 rounded-full", effective ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                  <span className="min-w-0 flex-1">
                    {p.description}
                    <code className="ml-1.5 rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {p.code}
                    </code>
                  </span>
                  <div className="flex overflow-hidden rounded-md border text-xs">
                    {(
                      [
                        ["inherit", fromRole ? "Theo vai (có)" : "Theo vai (không)"],
                        ["allow", "Cấp"],
                        ["deny", "Chặn"],
                      ] as const
                    ).map(([s, label]) => (
                      <button
                        key={s}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(p.code, s)}
                        className={cn(
                          "px-2 py-1 transition-colors",
                          state === s
                            ? s === "deny"
                              ? "bg-red-600 text-white"
                              : s === "allow"
                                ? "bg-emerald-600 text-white"
                                : "bg-foreground text-background"
                            : "hover:bg-muted",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function TreeSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  );
}
