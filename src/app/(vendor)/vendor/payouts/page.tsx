import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { VendorPayoutsTable } from "@/features/shop/components/vendor/vendor-payouts-table";

export const metadata: Metadata = { title: "Đối soát" };

export default function VendorPayoutsPage() {
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopPayoutRead}>
        <div className="flex flex-col gap-4">
          <PageHeader title="Đối soát" description="Sàn tự động đối soát và chi trả mỗi ngày — gồm cả đơn online (PayOS) và COD của gian hàng bạn" />
          <VendorPayoutsTable />
        </div>
      </PermissionGuard>
    </RoleGuard>
  );
}
