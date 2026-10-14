import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { VendorPromotionForm } from "@/features/promotion/components/vendor/vendor-promotion-form";

export const metadata: Metadata = { title: "Tạo mã giảm giá" };

export default function NewVendorPromotionPage() {
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopPromotionManage}>
        <div className="flex flex-col gap-4">
          <PageHeader title="Tạo mã giảm giá" description="Mã giảm giá cho sản phẩm của gian hàng bạn" />
          <VendorPromotionForm />
        </div>
      </PermissionGuard>
    </RoleGuard>
  );
}
