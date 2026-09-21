import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { PromotionsTable } from "@/features/promotion/components/promotions/promotions-table";

export const metadata: Metadata = { title: "Mã khuyến mãi" };

export default function PromotionsPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.promotionRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Mã khuyến mãi" description="Giảm %, giảm số tiền, miễn phí vận chuyển — theo ngành / sản phẩm, có hạn mức lượt dùng" />
        <PromotionsTable />
      </div>
    </PermissionGuard>
  );
}
