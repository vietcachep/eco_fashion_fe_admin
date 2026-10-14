import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ShopsTable } from "@/features/shop/components/platform/shops-table";

export const metadata: Metadata = { title: "Gian hàng" };

export default function AdminShopsPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.supplierShopRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Gian hàng" description="Duyệt, khoá gian hàng nhà cung cấp và chỉnh tỉ lệ hoa hồng" />
        <ShopsTable />
      </div>
    </PermissionGuard>
  );
}
