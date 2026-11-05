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
        <PageHeader title="Đơn hàng" description="Tìm đơn toàn sàn theo mã đơn, mã nhóm DHN… hoặc email khách — shop tự xác nhận, đóng gói, giao; sàn chỉ huỷ khi có tranh chấp" />
        <OrdersTable />
      </div>
    </PermissionGuard>
  );
}
