import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { BannersScreen } from "@/features/system/components/banners/banners-screen";

export const metadata: Metadata = { title: "Banner trang chủ" };

export default function BannersScreenPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.bannerManage}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Banner trang chủ" description="Ảnh hero và khối khuyến mãi trên web bán hàng, có lịch hiệu lực" />
        <BannersScreen />
      </div>
    </PermissionGuard>
  );
}
