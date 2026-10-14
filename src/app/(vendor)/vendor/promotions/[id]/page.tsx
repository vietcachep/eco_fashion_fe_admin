import type { Metadata } from "next";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { VendorPromotionDetail } from "@/features/promotion/components/vendor/vendor-promotion-detail";

export const metadata: Metadata = { title: "Chi tiết mã giảm giá" };

export default async function VendorPromotionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopPromotionRead}>
        <VendorPromotionDetail id={id} />
      </PermissionGuard>
    </RoleGuard>
  );
}
