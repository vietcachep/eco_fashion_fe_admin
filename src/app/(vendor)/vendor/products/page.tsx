import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ProductsTable } from "@/features/product/components/products/products-table";

export const metadata: Metadata = { title: "Sản phẩm của shop" };

export default function VendorProductsPage() {
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopProductRead}>
        <div className="flex flex-col gap-4">
          <PageHeader title="Sản phẩm" description="Sản phẩm của gian hàng bạn: tạo nháp → thêm biến thể & ảnh → đăng bán / ẩn" />
          <ProductsTable scope="vendor" />
        </div>
      </PermissionGuard>
    </RoleGuard>
  );
}
