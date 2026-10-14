import type { Metadata } from "next";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ProductDetailScreen } from "@/features/product/components/products/product-detail-screen";

export const metadata: Metadata = { title: "Chi tiết sản phẩm" };

export default async function VendorProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopProductRead}>
        <ProductDetailScreen scope="vendor" id={id} />
      </PermissionGuard>
    </RoleGuard>
  );
}
