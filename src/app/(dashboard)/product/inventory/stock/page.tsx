import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { StockTable } from "@/features/product/components/inventory/stock-table";

export const metadata: Metadata = { title: "Tồn kho" };

export default function StockPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.inventoryRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Tồn kho" description="Tồn theo biến thể: tồn / giữ cho đơn / khả dụng; sổ kho và điều chỉnh" />
        <StockTable />
      </div>
    </PermissionGuard>
  );
}
