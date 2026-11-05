import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { VendorViolationsScreen } from "@/features/shop/components/violations/vendor-violations-screen";

export const metadata: Metadata = { title: "Điểm vi phạm" };

export default function VendorViolationsPage() {
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopOrderRead}>
        <div className="flex flex-col gap-4">
          <PageHeader title="Điểm vi phạm" description="Điểm trừ khi đơn quá hạn xác nhận / giao hoặc shop tự huỷ đơn — đạt ngưỡng trong 30 ngày, sàn sẽ xem xét khoá gian hàng" />
          <VendorViolationsScreen />
        </div>
      </PermissionGuard>
    </RoleGuard>
  );
}
