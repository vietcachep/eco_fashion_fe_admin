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
        <PageHeader title="Đối soát (payout)" description="Sàn tự động chạy đối soát và chi trả mỗi ngày (cả COD và PayOS, cờ payout.auto_enabled ở Cấu hình hệ thống); chạy bù thủ công, thử lại và đánh dấu đã chi tại đây" />
        <PayoutsScreen />
      </div>
    </PermissionGuard>
  );
}
