import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ReceiptsTable } from "@/features/product/components/inventory/receipts-table";

export const metadata: Metadata = { title: "Phiếu nhập kho của shop" };

export default function VendorReceiptsPage() {
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopInventoryRead}>
        <div className="flex flex-col gap-4">
          <PageHeader title="Phiếu nhập kho" description="Lập phiếu nháp → kiểm → ghi sổ để cộng tồn" />
          <ReceiptsTable scope="vendor" />
        </div>
      </PermissionGuard>
    </RoleGuard>
  );
}
