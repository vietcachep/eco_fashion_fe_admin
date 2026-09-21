import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ReceiptForm } from "@/features/product/components/inventory/receipt-form";

export const metadata: Metadata = { title: "Lập phiếu nhập" };

export default function NewReceiptPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.inventoryReceive}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Lập phiếu nhập kho" description="Chọn biến thể, số lượng, giá vốn — lưu nháp rồi ghi sổ" />
        <ReceiptForm />
      </div>
    </PermissionGuard>
  );
}
