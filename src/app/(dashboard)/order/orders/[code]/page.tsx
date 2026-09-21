import type { Metadata } from "next";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { OrderDetail } from "@/features/order/components/orders/order-detail";

export const metadata: Metadata = { title: "Chi tiết đơn hàng" };

export default async function OrderDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <PermissionGuard permission={PERMISSIONS.orderRead}>
      <OrderDetail code={code} />
    </PermissionGuard>
  );
}
