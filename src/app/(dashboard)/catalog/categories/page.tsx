import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { CategoriesScreen } from "@/features/catalog/components/categories/categories-screen";

export const metadata: Metadata = { title: "Ngành hàng" };

export default function CategoriesPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.categoryRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Ngành hàng" description="Cây ngành hàng hiện trên menu web bán hàng; bấm ảnh để đổi ảnh đại diện" />
        <CategoriesScreen />
      </div>
    </PermissionGuard>
  );
}
