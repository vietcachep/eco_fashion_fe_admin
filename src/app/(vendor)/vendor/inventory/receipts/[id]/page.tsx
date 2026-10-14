import type { Metadata } from "next";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ReceiptDetail } from "@/features/product/components/inventory/receipt-detail";

export const metadata: Metadata = { title: "Chi tiết phiếu nhập" };

export default async function VendorReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopInventoryRead}>
        <ReceiptDetail scope="vendor" id={id} />
      </PermissionGuard>
    </RoleGuard>
  );
}
