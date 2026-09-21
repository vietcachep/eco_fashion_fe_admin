import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { RolesScreen } from "@/features/identity/components/roles/roles-screen";

export const metadata: Metadata = { title: "Vai trò & quyền" };

export default function RolesPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.roleRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Vai trò & quyền" description="Bộ quyền mặc định của từng vai nhân viên; quyền riêng chỉnh ở hồ sơ từng người" />
        <RolesScreen />
      </div>
    </PermissionGuard>
  );
}
