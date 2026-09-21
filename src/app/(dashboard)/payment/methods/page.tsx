import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { PaymentMethodsScreen } from "@/features/payment/components/methods/payment-methods-screen";

export const metadata: Metadata = { title: "Phương thức thanh toán" };

export default function PaymentMethodsPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.methodManage}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Phương thức thanh toán" description="Bật / tắt phương thức hiện ở bước đặt hàng" />
        <PaymentMethodsScreen />
      </div>
    </PermissionGuard>
  );
}
