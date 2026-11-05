import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { VendorReturnsTable } from "@/features/order/components/vendor/vendor-returns-table";

export const metadata: Metadata = { title: "Đổi trả của shop" };

export default function VendorReturnsPage() {
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopReturnRead}>
        <div className="flex flex-col gap-4">
          <PageHeader title="Đổi trả" description="Yêu cầu đổi trả của khách: duyệt hoặc từ chối → xác nhận đã nhận hàng → sàn hoàn tiền cho khách" />
          <VendorReturnsTable />
        </div>
      </PermissionGuard>
    </RoleGuard>
  );
}
