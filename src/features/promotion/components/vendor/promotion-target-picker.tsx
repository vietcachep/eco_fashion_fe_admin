"use client";

import { useEffect, useState } from "react";
import { ImageIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useShopCategoryLeaves, useShopProductNames, useShopProductSearch } from "@/features/promotion/hooks/use-shop-promotions";

/*
 * Chọn phạm vi áp dụng của mã giảm giá vendor, thay cho việc gõ tay slug / id:
 * - category: tick trong danh sách ngành LÁ shop đang bán (GET /shop/catalog/categories/leaves);
 * - product: tìm và thêm sản phẩm của chính shop (GET /shop/products?q=).
 * `value` là slug ngành (category) hoặc id sản phẩm (product) — đúng `targetRef` backend lưu.
 */

/* Bỏ dấu để ô tìm "dien thoai" khớp "Điện thoại". */
function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted/50 py-0.5 pr-1 pl-2.5 text-xs">
      <span className="truncate">{label}</span>
      <button
        type="button"
        aria-label={`Bỏ ${label}`}
        onClick={onRemove}
        className="flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <XIcon className="size-3" />
      </button>
    </span>
  );
}

export function PromotionTargetPicker({
  kind,
  value,
  onChange,
  invalid,
}: {
  kind: "category" | "product";
  value: string[];
  onChange: (next: string[]) => void;
  invalid?: boolean;
}) {
  return kind === "category" ? <CategoryTargets value={value} onChange={onChange} invalid={invalid} /> : <ProductTargets value={value} onChange={onChange} invalid={invalid} />;
}

type PickerProps = { value: string[]; onChange: (next: string[]) => void; invalid?: boolean };

function CategoryTargets({ value, onChange, invalid }: PickerProps) {
  const leaves = useShopCategoryLeaves();
  const [filter, setFilter] = useState("");
  const all = leaves.data ?? [];
  const labelOf = (slug: string) => all.find((l) => l.slug === slug)?.path ?? slug;
  const q = fold(filter.trim());
  const shown = q ? all.filter((l) => fold(l.path).includes(q)) : all;
  const toggle = (slug: string, on: boolean) => onChange(on ? [...value, slug] : value.filter((s) => s !== slug));

  return (
    <div className="flex flex-col gap-2">
      {value.length ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((slug) => (
            <Chip key={slug} label={labelOf(slug)} onRemove={() => toggle(slug, false)} />
          ))}
        </div>
      ) : null}
      <div className={cn("rounded-lg border", invalid && "border-destructive")}>
        <div className="relative border-b">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Tìm ngành hàng"
            placeholder="Tìm ngành hàng của shop…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-9 rounded-none border-0 pl-9 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          {leaves.isPending ? (
            <div className="flex flex-col gap-2 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full rounded" />
              ))}
            </div>
          ) : leaves.isError ? (
            <p className="p-3 text-sm text-destructive">Không tải được danh sách ngành hàng.</p>
          ) : shown.length ? (
            shown.map((l) => (
              <label key={l.id} className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60">
                <Checkbox className="mt-0.5" checked={value.includes(l.slug)} onCheckedChange={(on) => toggle(l.slug, on)} />
                <span className="min-w-0 leading-snug">{l.path}</span>
              </label>
            ))
          ) : (
            <p className="p-3 text-sm text-muted-foreground">{all.length ? "Không có ngành nào khớp." : "Shop chưa có ngành hàng nào được bật."}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductTargets({ value, onChange, invalid }: PickerProps) {
  const [term, setTerm] = useState("");
  const [keyword, setKeyword] = useState("");
  // Tên đã biết khi vừa thêm từ kết quả tìm — khỏi gọi thêm API cho các mục này.
  const [picked, setPicked] = useState<Map<string, string>>(() => new Map());

  useEffect(() => {
    const t = setTimeout(() => setKeyword(term.trim()), 350);
    return () => clearTimeout(t);
  }, [term]);

  const search = useShopProductSearch(keyword);
  const resolved = useShopProductNames(value.filter((id) => !picked.has(id)));
  const nameOf = (id: string) => picked.get(id) ?? resolved.get(id) ?? `Sản phẩm …${id.slice(-6)}`;
  const results = search.data ?? [];

  const add = (id: string, name: string) => {
    setPicked((prev) => new Map(prev).set(id, name));
    onChange([...value, id]);
  };

  return (
    <div className="flex flex-col gap-2">
      {value.length ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <Chip key={id} label={nameOf(id)} onRemove={() => onChange(value.filter((x) => x !== id))} />
          ))}
        </div>
      ) : null}
      <div className={cn("rounded-lg border", invalid && "border-destructive")}>
        <div className="relative border-b">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Tìm sản phẩm"
            placeholder="Tìm sản phẩm của shop theo tên…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="h-9 rounded-none border-0 pl-9 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {search.isPending ? (
            <div className="flex flex-col gap-2 p-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded" />
              ))}
            </div>
          ) : search.isError ? (
            <p className="p-3 text-sm text-destructive">Không tải được sản phẩm.</p>
          ) : results.length ? (
            results.map((p) => {
              const added = value.includes(p.id);
              return (
                <div key={p.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/60">
                  <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- ảnh động
                      <img src={p.imageUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <ImageIcon className="size-4 text-muted-foreground/60" />
                    )}
                  </div>
                  <p className="min-w-0 flex-1 text-sm leading-snug">
                    <span className="line-clamp-2">{p.name}</span>
                  </p>
                  <Button type="button" variant="outline" size="sm" className="h-7 shrink-0" disabled={added} onClick={() => add(p.id, p.name)}>
                    {added ? null : <PlusIcon className="size-3.5" />}
                    {added ? "Đã thêm" : "Thêm"}
                  </Button>
                </div>
              );
            })
          ) : (
            <p className="p-3 text-sm text-muted-foreground">Không tìm thấy sản phẩm nào.</p>
          )}
        </div>
      </div>
    </div>
  );
}
