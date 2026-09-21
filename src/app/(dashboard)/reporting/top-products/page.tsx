import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { TopProductsScreen } from "@/features/reporting/components/top-products/top-products-screen";

export const metadata: Metadata = { title: "Sản phẩm bán chạy" };

export default function TopProductsScreenPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.revenueRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Sản phẩm bán chạy" description="Xếp hạng theo số lượng bán trong kỳ" />
        <TopProductsScreen />
      </div>
    </PermissionGuard>
  );
}
