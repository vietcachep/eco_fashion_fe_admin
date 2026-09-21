import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { DashboardScreen } from "@/features/reporting/components/dashboard/dashboard-screen";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.dashboardRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Dashboard" description="Tổng quan vận hành cửa hàng FITLY" />
        <DashboardScreen />
      </div>
    </PermissionGuard>
  );
}
