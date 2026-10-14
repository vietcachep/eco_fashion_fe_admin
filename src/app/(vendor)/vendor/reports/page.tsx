import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ShopRevenueReport } from "@/features/reporting/components/vendor/shop-revenue-report";

export const metadata: Metadata = { title: "Báo cáo doanh thu của shop" };

export default function VendorReportsPage() {
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopReportRead}>
        <div className="flex flex-col gap-4">
          <PageHeader title="Báo cáo doanh thu" description="Doanh thu, đơn hàng và sản phẩm bán ra của gian hàng theo ngày / tháng" />
          <ShopRevenueReport />
        </div>
      </PermissionGuard>
    </RoleGuard>
  );
}
