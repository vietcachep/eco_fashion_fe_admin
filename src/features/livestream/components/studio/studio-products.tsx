"use client";
import { useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, PinIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { useLiveCommands, useLiveProducts } from "../../hooks/use-livestream";
import type { LiveSession } from "../../types/live";
import type { ProductCardResponse } from "@/lib/api/generated/model";
import { LiveProductSelector } from "../sessions/live-product-selector";
import { ProductThumb } from "../product-thumb";

export function StudioProducts({
  session,
  canManage,
}: {
  session: LiveSession;
  canManage: boolean;
}) {
  const query = useLiveProducts(session.id);
  const commands = useLiveCommands();
  const [open, setOpen] = useState(false);
  const products = query.data?.content ?? [];
  const ids = products.map((p) => p.productId);
  const reorder = (index: number, direction: number) => {
    const next = [...ids];
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    commands.products.mutate({
      id: session.id,
      ids: next,
      version: session.version,
    });
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Sản phẩm trên sóng</h2>
          <p className="text-xs text-muted-foreground">
            Số hàng giữ nguyên khi đổi thứ tự. Chỉ một sản phẩm được ghim.
          </p>
        </div>
        {canManage ? (
          <Button variant="outline" onClick={() => setOpen(true)}>
            <PlusIcon />
            Chọn sản phẩm
          </Button>
        ) : null}
      </div>
      {query.error || commands.products.error || commands.pin.error ? (
        <ApiErrorState
          compact
          error={query.error || commands.products.error || commands.pin.error}
          fallback="Không cập nhật được sản phẩm. Làm mới để lấy phiên bản mới."
        />
      ) : null}
      {query.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="divide-y rounded-xl border">
          {products.map((p, i) => (
            <div
              key={p.productId}
              className="flex flex-wrap items-center gap-3 p-3"
            >
              <span className="rounded-lg bg-primary/10 px-2 py-1 font-mono text-sm font-semibold text-primary">
                #{String(p.displayNumber).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <span className="float-left mr-3">
                  <ProductThumb key={p.card.imageUrl} src={p.card.imageUrl} />
                </span>
                <p className="text-sm font-medium">{p.card.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.card.price.display} ·{" "}
                  {p.card.inStock ? "Còn hàng" : "Hết hàng"}
                </p>
              </div>
              {canManage ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-11 min-w-11"
                    aria-label={`Đưa ${p.card.name} lên`}
                    disabled={i === 0 || commands.products.isPending}
                    onClick={() => reorder(i, -1)}
                  >
                    <ArrowUpIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-11 min-w-11"
                    aria-label={`Đưa ${p.card.name} xuống`}
                    disabled={
                      i === products.length - 1 || commands.products.isPending
                    }
                    onClick={() => reorder(i, 1)}
                  >
                    <ArrowDownIcon />
                  </Button>
                  <Button
                    variant={
                      session.pinnedProductId === p.productId
                        ? "default"
                        : "outline"
                    }
                    disabled={commands.pin.isPending}
                    onClick={() =>
                      commands.pin.mutate({
                        id: session.id,
                        productId:
                          session.pinnedProductId === p.productId
                            ? null
                            : p.productId,
                        version: session.version,
                      })
                    }
                  >
                    <PinIcon />
                    {session.pinnedProductId === p.productId
                      ? "Bỏ ghim"
                      : "Ghim"}
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
          {!products.length ? (
            <p className="p-5 text-sm text-muted-foreground">
              Chưa có sản phẩm trong phiên.
            </p>
          ) : null}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sản phẩm của phiên</DialogTitle>
            <DialogDescription>
              Thay đổi danh sách mà không tắt video đang phát.
            </DialogDescription>
          </DialogHeader>
          {open && query.data ? (
            <ProductEdit
              key={`${session.id}-${session.version}`}
              session={session}
              initial={products.map((p) => p.card)}
              onDone={() => setOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function ProductEdit({
  session,
  initial,
  onDone,
}: {
  session: LiveSession;
  initial: ProductCardResponse[];
  onDone: () => void;
}) {
  const [selected, setSelected] = useState(initial);
  const commands = useLiveCommands();
  return (
    <div className="space-y-4">
      <LiveProductSelector selected={selected} onChange={setSelected} />
      {commands.products.error ? (
        <ApiErrorState
          compact
          error={commands.products.error}
          fallback="Chưa lưu được danh sách."
        />
      ) : null}
      <Button
        disabled={commands.products.isPending}
        onClick={() =>
          commands.products.mutate(
            {
              id: session.id,
              ids: selected.map((p) => p.id),
              version: session.version,
            },
            { onSuccess: onDone },
          )
        }
      >
        Lưu danh sách
      </Button>
    </div>
  );
}
