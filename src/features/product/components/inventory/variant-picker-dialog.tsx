"use client";

import { useEffect, useState } from "react";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { formatNumber } from "@/lib/format";
import { useStock } from "@/features/product/hooks/use-inventory";
import { variantLabel, type InventoryScope } from "@/features/product/types/inventory";
import type { StockRowResponse } from "@/lib/api/generated/model";

/*
 * Chọn biến thể (cho phiếu nhập): tìm theo tên sản phẩm / SKU trên bảng tồn
 * kho (server), bấm một dòng để thêm. Danh sách tối đa 20 dòng đầu — gõ cụ
 * thể hơn thay vì cuộn dài. `scope` quyết định tìm trong kho toàn sàn hay chỉ
 * biến thể của shop mình (backend vendor đã giới hạn theo shop). Chỉ gọi API
 * khi dialog đang mở.
 */
export function VariantPickerDialog({
  scope,
  open,
  onOpenChange,
  onPick,
  excludeIds,
}: {
  scope: InventoryScope;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (row: StockRowResponse) => void;
  excludeIds: Set<string>;
}) {
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setKeyword(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isFetching, error } = useStock(scope, { keyword, page: 1, size: 20 }, { enabled: open });
  const rows = (data?.content ?? []).filter((r) => !excludeIds.has(r.variantId));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Chọn biến thể</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus className="pl-9" placeholder="Tên sản phẩm hoặc SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="max-h-80 overflow-y-auto rounded-lg border">
          {error ? (
            <div className="p-3">
              <ApiErrorState error={error} fallback="Không tải được danh sách biến thể." compact />
            </div>
          ) : isFetching && !data ? (
            <div className="flex flex-col gap-2 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Không thấy biến thể phù hợp.</p>
          ) : (
            rows.map((r) => {
              const label = variantLabel(r);
              return (
                <Button
                  key={r.variantId}
                  variant="ghost"
                  className="h-auto w-full justify-between rounded-none border-b px-3 py-2 text-left last:border-0"
                  onClick={() => onPick(r)}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{r.productName}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {label ? `${label} · ` : ""}
                      <code className="font-mono">{r.sku}</code>
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">tồn {formatNumber(r.stock)}</span>
                </Button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
