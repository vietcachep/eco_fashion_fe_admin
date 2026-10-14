import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ShopMembersScreen } from "@/features/shop/components/vendor/shop-members-screen";

export const metadata: Metadata = { title: "Nhân viên shop" };

export default function VendorShopMembersPage() {
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopStaffRead}>
        <div className="flex flex-col gap-4">
          <PageHeader title="Nhân viên shop" description="Thêm nhân viên (tạo tài khoản đăng nhập cho họ), đổi vai và gỡ nhân viên của gian hàng" />
          <ShopMembersScreen />
        </div>
      </PermissionGuard>
    </RoleGuard>
  );
}
