import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { AttributesScreen } from "@/features/catalog/components/attributes/attributes-screen";

export const metadata: Metadata = { title: "Thuộc tính" };

export default function AttributesPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.attributeManage}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Thuộc tính sản phẩm" description="Màu sắc, size, chất liệu — dùng khi tạo biến thể sản phẩm" />
        <AttributesScreen />
      </div>
    </PermissionGuard>
  );
}
