import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { PayoutsScreen } from "@/features/shop/components/platform/payouts-screen";

export const metadata: Metadata = { title: "Đối soát" };

export default function AdminPayoutsPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.supplierPayoutRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Đối soát (payout)" description="Chạy kỳ đối soát, theo dõi và chi tiền cho gian hàng theo từng kỳ" />
        <PayoutsScreen />
      </div>
    </PermissionGuard>
  );
}
