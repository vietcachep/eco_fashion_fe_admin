import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { VendorReviewsList } from "@/features/review/components/vendor/vendor-reviews-list";

export const metadata: Metadata = { title: "Đánh giá sản phẩm của shop" };

export default function VendorReviewsPage() {
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopReviewRead}>
        <div className="flex flex-col gap-4">
          <PageHeader title="Đánh giá sản phẩm" description="Đánh giá của khách về sản phẩm của gian hàng bạn — trả lời công khai dưới tên shop" />
          <VendorReviewsList />
        </div>
      </PermissionGuard>
    </RoleGuard>
  );
}
