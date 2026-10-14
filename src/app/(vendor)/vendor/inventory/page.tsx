import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { StockTable } from "@/features/product/components/inventory/stock-table";

export const metadata: Metadata = { title: "Kho hàng của shop" };

export default function VendorInventoryPage() {
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopInventoryRead}>
        <div className="flex flex-col gap-4">
          <PageHeader title="Tồn kho" description="Tồn theo phân loại: tồn / giữ cho đơn / khả dụng; sổ kho và điều chỉnh" />
          <StockTable scope="vendor" />
        </div>
      </PermissionGuard>
    </RoleGuard>
  );
}
