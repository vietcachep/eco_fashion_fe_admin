import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ReceiptsTable } from "@/features/product/components/inventory/receipts-table";

export const metadata: Metadata = { title: "Phiếu nhập kho" };

export default function ReceiptsPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.inventoryRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Phiếu nhập kho" description="Lập phiếu nháp → kiểm → ghi sổ để cộng tồn" />
        <ReceiptsTable scope="platform" />
      </div>
    </PermissionGuard>
  );
}
