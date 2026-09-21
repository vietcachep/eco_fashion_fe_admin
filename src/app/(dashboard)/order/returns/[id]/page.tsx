import type { Metadata } from "next";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ReturnDetail } from "@/features/order/components/returns/return-detail";

export const metadata: Metadata = { title: "Chi tiết đổi trả" };

export default async function ReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PermissionGuard permission={PERMISSIONS.returnRead}>
      <ReturnDetail id={id} />
    </PermissionGuard>
  );
}
