import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ReviewsTable } from "@/features/review/components/reviews/reviews-table";

export const metadata: Metadata = { title: "Đánh giá sản phẩm" };

export default function ReviewsPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.reviewRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Đánh giá sản phẩm" description="Khách đã nhận hàng mới đánh giá được; ẩn / hiện và trả lời thay cửa hàng" />
        <ReviewsTable />
      </div>
    </PermissionGuard>
  );
}
