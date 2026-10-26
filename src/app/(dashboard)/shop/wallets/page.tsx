import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { WalletsScreen } from "@/features/shop/components/platform/wallets-screen";

export const metadata: Metadata = { title: "Ví đặt cọc COD" };

export default function AdminWalletsPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.supplierWalletRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Ví đặt cọc COD" description="Gian hàng chỉ bán được COD khi ví > 0. Đối chiếu và duyệt khoản nộp cọc; ví về 0 hoặc âm thì COD tự đóng" />
        <WalletsScreen />
      </div>
    </PermissionGuard>
  );
}
