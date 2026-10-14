import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { VendorPromotionsTable } from "@/features/promotion/components/vendor/vendor-promotions-table";

export const metadata: Metadata = { title: "Mã giảm giá của shop" };

export default function VendorPromotionsPage() {
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopPromotionRead}>
        <div className="flex flex-col gap-4">
          <PageHeader title="Mã giảm giá" description="Mã do gian hàng bạn chịu chi phí, chỉ áp cho đơn hàng của shop — giảm %, số tiền cố định hoặc miễn phí vận chuyển" />
          <VendorPromotionsTable />
        </div>
      </PermissionGuard>
    </RoleGuard>
  );
}
