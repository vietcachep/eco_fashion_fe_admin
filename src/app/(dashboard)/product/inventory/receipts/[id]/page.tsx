import type { Metadata } from "next";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ReceiptDetail } from "@/features/product/components/inventory/receipt-detail";

export const metadata: Metadata = { title: "Chi tiết phiếu nhập" };

export default async function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PermissionGuard permission={PERMISSIONS.inventoryRead}>
      <ReceiptDetail id={id} />
    </PermissionGuard>
  );
}
