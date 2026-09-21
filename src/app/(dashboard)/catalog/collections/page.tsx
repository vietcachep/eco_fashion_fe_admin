import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { CollectionsScreen } from "@/features/catalog/components/collections/collections-screen";

export const metadata: Metadata = { title: "Bộ sưu tập" };

export default function CollectionsPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.collectionManage}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Bộ sưu tập" description="Bộ lọc đặt tên (ngành + giới + tag) hiện thành khối trên trang chủ" />
        <CollectionsScreen />
      </div>
    </PermissionGuard>
  );
}
