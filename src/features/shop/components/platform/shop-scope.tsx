"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeftIcon, StoreIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { formatNumber } from "@/lib/format";
import { ShopStatusBadge } from "@/features/shop/components/platform/shop-cells";
import { useShopDirectory, useShopDirectoryItem } from "@/features/shop/hooks/use-admin-shops";

/*
 * Cổng chọn gian hàng cho các màn phía SÀN (sản phẩm, đơn…): dữ liệu của mọi shop
 * trộn một danh sách thì không biết thuộc shop nào. Chưa chọn shop (`?shopId=`)
 * → lưới các shop, bấm vào mới thấy dữ liệu của shop đó; đã chọn → thanh "Đang xem
 * shop X" + nút quay lại. `shopId` nằm trên URL nên F5 / chia sẻ link vẫn giữ nguyên.
 */
export function ShopScope({ noun, children }: { noun: string; children: (shopId: string) => ReactNode }) {
  const shopId = useSearchParams().get("shopId") ?? "";
  if (!shopId) return <ShopPicker noun={noun} />;
  return (
    <div className="flex flex-col gap-3">
      <CurrentShopBar shopId={shopId} noun={noun} />
      {/* key: đổi shop thì dựng lại bảng, không giữ trang / bộ lọc của shop trước. */}
      <div key={shopId}>{children(shopId)}</div>
    </div>
  );
}

function CurrentShopBar({ shopId, noun }: { shopId: string; noun: string }) {
  const pathname = usePathname();
  const { data: shop } = useShopDirectoryItem(shopId);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
      <Link href={pathname} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeftIcon className="size-4" />
        Tất cả gian hàng
      </Link>
      <span className="text-muted-foreground">/</span>
      <span className="inline-flex items-center gap-2 text-sm">
        <StoreIcon className="size-4 text-muted-foreground" />
        <span className="font-semibold">{shop?.name ?? "Gian hàng"}</span>
        {shop ? <span className="font-mono text-xs text-muted-foreground">{shop.code}</span> : null}
        {shop ? <ShopStatusBadge status={shop.status} /> : null}
      </span>
      <span className="text-xs text-muted-foreground">Đang xem {noun} của gian hàng này</span>
    </div>
  );
}

function ShopPicker({ noun }: { noun: string }) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setKeyword(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, error } = useShopDirectory({ keyword, page: 1, size: 60 });
  const shops = data?.content ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Chọn một gian hàng để xem {noun} của gian hàng đó.</p>
        <Input className="w-72" placeholder="Tìm gian hàng theo tên / mã…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {isError ? <ApiErrorState error={error} fallback="Không tải được danh sách gian hàng." /> : null}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : shops.length === 0 && !isError ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Không có gian hàng nào khớp.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shops.map((s) => (
            <Link
              key={s.id}
              href={`${pathname}?shopId=${s.id}`}
              className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary hover:bg-muted/40"
            >
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
                {s.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- ảnh động Cloudinary
                  <img src={s.logoUrl} alt="" className="size-full object-cover" />
                ) : (
                  <StoreIcon className="size-5 text-muted-foreground/60" />
                )}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate font-semibold">{s.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{s.code}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatNumber(s.totalProducts)} sản phẩm
                </p>
              </div>
              <ShopStatusBadge status={s.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
