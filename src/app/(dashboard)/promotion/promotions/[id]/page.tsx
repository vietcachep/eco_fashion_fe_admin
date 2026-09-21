import type { Metadata } from "next";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { PromotionDetail } from "@/features/promotion/components/promotions/promotion-detail";

export const metadata: Metadata = { title: "Chi tiết mã khuyến mãi" };

export default async function PromotionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PermissionGuard permission={PERMISSIONS.promotionRead}>
      <PromotionDetail id={id} />
    </PermissionGuard>
  );
}
