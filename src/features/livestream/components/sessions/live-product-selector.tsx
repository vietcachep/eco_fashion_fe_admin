"use client";
import { useEffect, useState } from "react";
import type { ProductCardResponse } from "@/lib/api/generated/model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveProductOptions } from "../../hooks/use-livestream";
import { ProductThumb } from "../product-thumb";

export function LiveProductSelector({
  selected,
  onChange,
}: {
  selected: ProductCardResponse[];
  onChange: (cards: ProductCardResponse[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setKeyword(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  const [page, setPage] = useState(1);
  const query = useLiveProductOptions(page, keyword);
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">
          Sản phẩm trong phiên{" "}
          <span className="text-sm font-normal text-muted-foreground">
            {selected.length}/50
          </span>
        </h2>
        <p className="text-xs text-muted-foreground">
          Chỉ sản phẩm đang bán của gian hàng bạn
        </p>
      </div>
      <Input
        aria-label="Tìm sản phẩm để thêm vào live"
        placeholder="Tìm sản phẩm…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />
      {selected.length ? (
        <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-lg bg-muted/30 p-3">
          {selected.map((card, index) => (
            <button
              type="button"
              key={card.id}
              className="rounded-md border bg-background px-2 py-1 text-left text-xs hover:border-destructive"
              onClick={() => onChange(selected.filter((p) => p.id !== card.id))}
              aria-label={`Bỏ ${card.name}`}
            >
              {index + 1}. {card.name} ×
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Chọn sản phẩm bên dưới. Bạn có thể đổi thứ tự trong studio.
        </p>
      )}
      {query.error ? (
        <ApiErrorState
          compact
          error={query.error}
          fallback="Không tải được sản phẩm."
        />
      ) : null}
      {query.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="max-h-96 divide-y overflow-y-auto rounded-xl border">
          {query.data?.content.map((card) => {
            const checked = selected.some((p) => p.id === card.id);
            return (
              <label
                key={card.id}
                className="flex cursor-pointer items-center gap-3 p-3 hover:bg-muted/30"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!checked && selected.length >= 50}
                  onChange={() =>
                    onChange(
                      checked
                        ? selected.filter((p) => p.id !== card.id)
                        : [...selected, card],
                    )
                  }
                  className="size-4 accent-primary"
                />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="float-left mr-3">
                    <ProductThumb key={card.imageUrl} src={card.imageUrl} />
                  </span>
                  {card.name}
                  <span className="block text-xs text-muted-foreground">
                    {card.price.display}
                    {!card.inStock ? " · Hết hàng" : ""}
                  </span>
                </span>
              </label>
            );
          })}
          {!query.data?.content.length ? (
            <p className="p-5 text-sm text-muted-foreground">
              Chưa có sản phẩm phù hợp.
            </p>
          ) : null}
        </div>
      )}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          Trước
        </Button>
        <span className="text-xs text-muted-foreground">
          Trang {page}/{query.data?.totalPages || 1}
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={page >= (query.data?.totalPages || 1)}
          onClick={() => setPage(page + 1)}
        >
          Sau
        </Button>
      </div>
    </section>
  );
}
