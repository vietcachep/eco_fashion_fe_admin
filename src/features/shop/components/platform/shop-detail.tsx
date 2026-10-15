"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs, type FilterTab } from "@/components/shared/filter-tabs";
import { PageHeader } from "@/components/shared/page-header";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import type { AdminShopResponse } from "@/lib/api/generated/model";
import { usePermission } from "@/hooks/use-permission";
import { ShopStatusBadge } from "@/features/shop/components/platform/shop-cells";
import {
  ShopActionDialogs,
  useShopActionItems,
  type ShopAction,
  type ShopActionKind,
} from "@/features/shop/components/platform/shop-actions";
import { ShopPayoutsTab } from "@/features/shop/components/platform/shop-payouts-tab";
import { ShopProfileTab } from "@/features/shop/components/platform/shop-profile-tab";
import { useAdminShop } from "@/features/shop/hooks/use-admin-shops";

const LOAD_ERROR = "Không tải được gian hàng.";

type TabKey = "profile" | "payouts";

/* Nút thao tác ở đầu trang — cùng bộ thao tác với menu "⋯" ở danh sách (xem shop-actions). */
function ShopHeaderActions({ shop, onAction }: { shop: AdminShopResponse; onAction: (kind: ShopActionKind) => void }) {
  const items = useShopActionItems(shop);
  return (
    <>
      {items.map((item) => (
        <Button
          key={item.kind}
          variant={item.destructive ? "destructive" : item.primary ? "default" : "outline"}
          onClick={() => onAction(item.kind)}
        >
          <item.icon className="size-4" />
          {item.label}
        </Button>
      ))}
    </>
  );
}

/*
 * Chi tiết MỘT gian hàng (sàn xem, quyền supplier.shop.read) gồm hai tab: Hồ sơ (kèm tài khoản
 * ngân hàng đầy đủ) và Đối soát. Tab hiện tại nằm ở `?tab=`; tab đối soát chỉ hiện khi có quyền đọc.
 */
export function ShopDetail({ id }: { id: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: shop, isPending, error } = useAdminShop(id);
  const canPayout = usePermission(PERMISSIONS.supplierPayoutRead);
  const [action, setAction] = useState<ShopAction | null>(null);

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;
  if (isPending || !shop) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  const tabs: FilterTab[] = [{ key: "profile", label: "Hồ sơ" }];
  if (canPayout) tabs.push({ key: "payouts", label: "Đối soát" });
  const requested = searchParams.get("tab");
  const tab = (tabs.some((t) => t.key === requested) ? requested : "profile") as TabKey;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={shop.name} description={shop.code}>
        {/* Bọc flex-wrap: vài nút thao tác + badge phải xuống dòng được ở 390px. */}
        <div className="flex flex-wrap items-center gap-2">
          <ShopStatusBadge status={shop.status} />
          <Button variant="outline" nativeButton={false} render={<Link href={ROUTES.shop.shops} />}>
            <ArrowLeftIcon className="size-4" />
            Danh sách
          </Button>
          <ShopHeaderActions shop={shop} onAction={(kind) => setAction({ kind, shop })} />
        </div>
      </PageHeader>

      {tabs.length > 1 ? (
        <FilterTabs tabs={tabs} value={tab} onChange={(key) => router.replace(`${pathname}?tab=${key}`, { scroll: false })} />
      ) : null}

      {tab === "profile" ? <ShopProfileTab shop={shop} /> : null}
      {tab === "payouts" ? <ShopPayoutsTab shopId={shop.id} shopName={shop.name} /> : null}

      <ShopActionDialogs action={action} onClose={() => setAction(null)} />
    </div>
  );
}
