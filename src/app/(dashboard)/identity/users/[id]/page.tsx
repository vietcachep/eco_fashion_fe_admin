import type { Metadata } from "next";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { UserDetail } from "@/features/identity/components/users/user-detail";

export const metadata: Metadata = { title: "Chi tiết người dùng" };

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PermissionGuard permission={PERMISSIONS.userRead}>
      <UserDetail id={id} />
    </PermissionGuard>
  );
}
