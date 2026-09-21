import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { PaymentsTable } from "@/features/payment/components/payments/payments-table";

export const metadata: Metadata = { title: "Giao dịch thanh toán" };

export default function PaymentsPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.paymentRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Giao dịch thanh toán" description="COD · chuyển khoản VietQR (đối soát) · VNPay" />
        <PaymentsTable />
      </div>
    </PermissionGuard>
  );
}
