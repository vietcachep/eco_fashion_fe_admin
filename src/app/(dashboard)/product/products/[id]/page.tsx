import type { Metadata } from "next";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ProductDetailScreen } from "@/features/product/components/products/product-detail-screen";

export const metadata: Metadata = { title: "Chi tiết sản phẩm" };

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PermissionGuard permission={PERMISSIONS.productRead}>
      <ProductDetailScreen scope="platform" id={id} />
    </PermissionGuard>
  );
}
