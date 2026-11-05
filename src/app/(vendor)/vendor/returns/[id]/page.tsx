import type { Metadata } from "next";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { VendorReturnDetail } from "@/features/order/components/vendor/vendor-return-detail";

export const metadata: Metadata = { title: "Chi tiết đổi trả" };

export default async function VendorReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopReturnRead}>
        <VendorReturnDetail id={id} />
      </PermissionGuard>
    </RoleGuard>
  );
}
