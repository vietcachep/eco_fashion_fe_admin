import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { PromotionForm } from "@/features/promotion/components/promotions/promotion-form";
import type { PromotionInput } from "@/features/promotion/schemas/promotion-schema";

export const metadata: Metadata = { title: "Tạo mã khuyến mãi" };

/*
 * Nhận sẵn tham số từ màn "Nhận xét vận hành" (combo AI gợi ý): type, value,
 * appliesTo, targets, name — người dùng vẫn sửa được trước khi tạo.
 */
export default async function NewPromotionPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const initial: Partial<PromotionInput> = {
    ...(sp.name ? { name: sp.name } : {}),
    ...(sp.type === "percentage" || sp.type === "fixed_amount" || sp.type === "free_shipping" ? { type: sp.type as PromotionInput["type"] } : {}),
    ...(sp.value && !Number.isNaN(Number(sp.value)) ? { value: Number(sp.value) } : {}),
    ...(sp.appliesTo === "all" || sp.appliesTo === "category" || sp.appliesTo === "product" ? { appliesTo: sp.appliesTo as PromotionInput["appliesTo"] } : {}),
    ...(sp.targets ? { targets: sp.targets } : {}),
  };
  return (
    <PermissionGuard permission={PERMISSIONS.promotionManage}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Tạo mã khuyến mãi" />
        <PromotionForm initial={initial} />
      </div>
    </PermissionGuard>
  );
}
