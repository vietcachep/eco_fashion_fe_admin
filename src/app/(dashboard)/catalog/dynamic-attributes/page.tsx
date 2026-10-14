import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { DynamicAttributesScreen } from "@/features/catalog/components/dynamic-attributes/dynamic-attributes-screen";

export const metadata: Metadata = { title: "Thuộc tính động" };

/*
 * Kho thuộc tính dùng chung cho các ngành hàng `dynamic` (PLAN-0016): admin tạo thuộc tính + giá trị
 * ở đây, rồi gán vào từng ngành ở "Ngành hàng → Mẫu thuộc tính". Đọc: catalog.dynamic_attribute.read;
 * ghi: catalog.dynamic_attribute.manage (nút ghi do màn tự ẩn).
 */
export default function DynamicAttributesPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.dynamicAttributeRead}>
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Thuộc tính động"
          description="Kho thuộc tính dùng chung cho các ngành hàng đa ngành (RAM, Dung lượng, Hương vị…). Gán vào ngành ở mục Ngành hàng → Mẫu thuộc tính"
        />
        <DynamicAttributesScreen />
      </div>
    </PermissionGuard>
  );
}
