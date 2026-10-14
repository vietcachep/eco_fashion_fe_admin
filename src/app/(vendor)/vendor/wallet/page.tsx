import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ShopWalletPanel } from "@/features/shop/components/vendor/shop-wallet-panel";

export const metadata: Metadata = { title: "Ví quỹ COD" };

export default function VendorWalletPage() {
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopWalletRead}>
        <div className="flex flex-col gap-4">
          <PageHeader title="Ví quỹ COD" description="Quỹ để sàn thu hoa hồng đơn COD — hết quỹ thì COD bị khoá" />
          <ShopWalletPanel />
        </div>
      </PermissionGuard>
    </RoleGuard>
  );
}
