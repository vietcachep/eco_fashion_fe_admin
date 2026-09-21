import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { RevenueScreen } from "@/features/reporting/components/revenue/revenue-screen";

export const metadata: Metadata = { title: "Báo cáo doanh thu" };

export default function RevenueScreenPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.revenueRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Báo cáo doanh thu" description="Doanh thu, đơn, sản phẩm bán ra theo ngày / tháng (worker chốt số 5 phút/lần)" />
        <RevenueScreen />
      </div>
    </PermissionGuard>
  );
}
