import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { RefundsTable } from "@/features/payment/components/refunds/refunds-table";

export const metadata: Metadata = { title: "Hoàn tiền" };

export default function RefundsPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.paymentRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Hoàn tiền" description="Yêu cầu hoàn từ huỷ đơn đã thanh toán / đổi trả được duyệt" />
        <RefundsTable />
      </div>
    </PermissionGuard>
  );
}
