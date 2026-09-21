import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { InventoryReportScreen } from "@/features/reporting/components/inventory/inventory-report-screen";

export const metadata: Metadata = { title: "Báo cáo tồn kho" };

export default function InventoryReportScreenPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.inventoryReportRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Báo cáo tồn kho" description="Tổng quan tồn, giá trị tồn và biến thể sắp hết" />
        <InventoryReportScreen />
      </div>
    </PermissionGuard>
  );
}
