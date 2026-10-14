import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { WalletsTable } from "@/features/shop/components/platform/wallets-table";

export const metadata: Metadata = { title: "Ví quỹ COD" };

export default function AdminWalletsPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.supplierWalletRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Ví quỹ COD" description="Số dư quỹ của từng gian hàng — ví ≤ 0 thì COD của shop bị khoá" />
        <WalletsTable />
      </div>
    </PermissionGuard>
  );
}
