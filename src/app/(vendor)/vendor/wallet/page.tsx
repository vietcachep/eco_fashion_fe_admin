import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { VendorWalletScreen } from "@/features/shop/components/vendor/vendor-wallet-screen";

export const metadata: Metadata = { title: "Ví đặt cọc COD" };

export default function VendorWalletPage() {
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopWalletRead}>
        <div className="flex flex-col gap-4">
          <PageHeader title="Ví đặt cọc COD" description="Nạp tiền vào ví để bán thanh toán khi nhận hàng (COD) — sàn tự trừ hoa hồng mỗi đơn COD giao thành công" />
          <VendorWalletScreen />
        </div>
      </PermissionGuard>
    </RoleGuard>
  );
}
