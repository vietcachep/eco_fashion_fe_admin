"use client";

import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboboxOption = { id: string; label: string; hex?: string | null };

/*
 * Combobox chọn NHIỀU giá trị, xổ xuống + gõ để tìm (bỏ dấu không bắt buộc — lọc theo nhãn).
 * Dùng cho trục biến thể (màu/size…) khi danh sách giá trị dài. Giá trị điều khiển từ ngoài theo mảng id.
 */
export function MultiCombobox({
  options,
  value,
  onChange,
  placeholder = "Chọn…",
  emptyText = "Không có kết quả",
  disabled,
  ariaLabel,
}: {
  options: ComboboxOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const selected = options.filter((o) => value.includes(o.id));
  return (
    <Combobox.Root<ComboboxOption, true>
      items={options}
      multiple
      value={selected}
      onValueChange={(next) => onChange(next.map((o) => o.id))}
      itemToStringLabel={(o) => o.label}
      isItemEqualToValue={(a, b) => a.id === b.id}
      disabled={disabled}
    >
      <Combobox.InputGroup className="flex min-h-9 w-full cursor-text flex-wrap items-center gap-1 rounded-md border bg-background px-2 py-1 focus-within:ring-2 focus-within:ring-ring/40 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60">
        <Combobox.Chips className="flex w-full flex-wrap items-center gap-1">
          {selected.map((o) => (
            <Combobox.Chip
              key={o.id}
              className="inline-flex h-6 items-center gap-1 rounded-md bg-primary/10 pr-1 pl-2 text-xs font-medium text-primary"
              aria-label={o.label}
            >
              {o.hex ? <span className="size-3 rounded-full border" style={{ background: o.hex }} /> : null}
              {o.label}
              <Combobox.ChipRemove className="flex size-4 items-center justify-center rounded hover:bg-primary/20" aria-label={`Bỏ ${o.label}`}>
                <XIcon className="size-3" />
              </Combobox.ChipRemove>
            </Combobox.Chip>
          ))}
          <Combobox.Input
            aria-label={ariaLabel}
            placeholder={selected.length > 0 ? "Thêm…" : placeholder}
            className="h-6 min-w-16 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <Combobox.Trigger className="ml-auto flex size-6 items-center justify-center text-muted-foreground" aria-label="Mở danh sách">
            <ChevronDownIcon className="size-4" />
          </Combobox.Trigger>
        </Combobox.Chips>
      </Combobox.InputGroup>
      <Combobox.Portal>
        <Combobox.Positioner className="z-50" sideOffset={4}>
          <Combobox.Popup className="max-h-64 w-[var(--anchor-width)] overflow-y-auto rounded-md border bg-popover py-1 text-popover-foreground shadow-md">
            <Combobox.Empty>
              <div className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</div>
            </Combobox.Empty>
            <Combobox.List>
              {(o: ComboboxOption) => (
                <Combobox.Item
                  key={o.id}
                  value={o}
                  className={cn(
                    "grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 px-3 py-1.5 text-sm outline-none select-none",
                    "data-[highlighted]:bg-muted",
                  )}
                >
                  <Combobox.ItemIndicator className="col-start-1">
                    <CheckIcon className="size-4" />
                  </Combobox.ItemIndicator>
                  <span className="col-start-2 inline-flex items-center gap-2">
                    {o.hex ? <span className="size-3.5 rounded-full border" style={{ background: o.hex }} /> : null}
                    {o.label}
                  </span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
