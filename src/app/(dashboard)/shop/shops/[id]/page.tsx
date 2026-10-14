import type { Metadata } from "next";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ShopDetail } from "@/features/shop/components/platform/shop-detail";

export const metadata: Metadata = { title: "Chi tiết gian hàng" };

export default async function AdminShopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PermissionGuard permission={PERMISSIONS.supplierShopRead}>
      <ShopDetail id={id} />
    </PermissionGuard>
  );
}
