import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ReceiptForm } from "@/features/product/components/inventory/receipt-form";

export const metadata: Metadata = { title: "Lập phiếu nhập" };

export default function VendorNewReceiptPage() {
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopInventoryManage}>
        <div className="flex flex-col gap-4">
          <PageHeader title="Lập phiếu nhập kho" description="Chọn phân loại hàng của shop, số lượng, giá vốn — lưu nháp rồi ghi sổ" />
          <ReceiptForm scope="vendor" />
        </div>
      </PermissionGuard>
    </RoleGuard>
  );
}
