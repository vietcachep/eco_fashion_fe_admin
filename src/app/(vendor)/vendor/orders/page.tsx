import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { VendorOrdersTable } from "@/features/order/components/vendor/vendor-orders-table";

export const metadata: Metadata = { title: "Đơn hàng của shop" };

export default function VendorOrdersPage() {
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopOrderRead}>
        <div className="flex flex-col gap-4">
          <PageHeader title="Đơn hàng" description="Đơn của gian hàng bạn: xác nhận → đóng gói → giao vận chuyển" />
          <VendorOrdersTable />
        </div>
      </PermissionGuard>
    </RoleGuard>
  );
}
