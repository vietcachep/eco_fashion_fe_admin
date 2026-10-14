import type { Metadata } from "next";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { VendorOrderDetail } from "@/features/order/components/vendor/vendor-order-detail";

export const metadata: Metadata = { title: "Chi tiết đơn hàng" };

export default async function VendorOrderDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopOrderRead}>
        <VendorOrderDetail code={code} />
      </PermissionGuard>
    </RoleGuard>
  );
}
