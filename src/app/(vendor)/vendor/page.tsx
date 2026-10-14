import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { VendorDashboard } from "@/features/reporting/components/vendor/vendor-dashboard";

export const metadata: Metadata = { title: "Dashboard nhà cung cấp" };

export default function VendorDashboardPage() {
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopReportRead}>
        <div className="flex flex-col gap-4">
          <PageHeader title="Dashboard" description="Tổng quan gian hàng của bạn trên sàn FITLY" />
          <VendorDashboard />
        </div>
      </PermissionGuard>
    </RoleGuard>
  );
}
