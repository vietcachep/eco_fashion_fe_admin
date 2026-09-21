import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ProductForm } from "@/features/product/components/products/product-form";

export const metadata: Metadata = { title: "Thêm sản phẩm" };

export default function NewProductPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.productCreate}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Thêm sản phẩm" description="Tạo ở trạng thái nháp; thêm biến thể và ảnh rồi mới đăng bán" />
        <ProductForm />
      </div>
    </PermissionGuard>
  );
}
