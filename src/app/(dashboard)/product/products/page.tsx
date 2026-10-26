import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ProductsTable } from "@/features/product/components/products/products-table";

export const metadata: Metadata = { title: "Sản phẩm" };

export default function ProductsPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.productRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Sản phẩm" description="Giám sát sản phẩm theo từng gian hàng — shop tự tạo và sửa; sàn chỉ chặn bán hoặc mở bán lại khi vi phạm" />
        <ProductsTable scope="platform" />
      </div>
    </PermissionGuard>
  );
}
