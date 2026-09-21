import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { OrdersTable } from "@/features/order/components/orders/orders-table";

export const metadata: Metadata = { title: "Đơn hàng" };

export default function OrdersPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.orderRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Đơn hàng" description="Chờ xác nhận → đóng gói → giao → hoàn tất; huỷ thay khách khi cần" />
        <OrdersTable />
      </div>
    </PermissionGuard>
  );
}
