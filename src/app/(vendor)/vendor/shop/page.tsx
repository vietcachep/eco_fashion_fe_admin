import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ShopProfileForm } from "@/features/shop/components/vendor/shop-profile-form";

export const metadata: Metadata = { title: "Hồ sơ gian hàng" };

export default function VendorShopProfilePage() {
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopProfileRead}>
        <div className="flex flex-col gap-4">
          <PageHeader title="Hồ sơ & tài khoản ngân hàng" description="Thông tin hiển thị cho khách và tài khoản nhận tiền đối soát" />
          <ShopProfileForm />
        </div>
      </PermissionGuard>
    </RoleGuard>
  );
}
