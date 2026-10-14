import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { WalletDepositsTable } from "@/features/shop/components/platform/wallet-deposits-table";

export const metadata: Metadata = { title: "Yêu cầu nộp quỹ" };

export default function AdminWalletDepositsPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.supplierWalletRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Yêu cầu nộp quỹ" description="Đối chiếu chứng từ chuyển khoản rồi duyệt để cộng ví và mở lại COD cho shop" />
        <WalletDepositsTable />
      </div>
    </PermissionGuard>
  );
}
