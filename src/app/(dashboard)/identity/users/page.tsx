import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { UsersTable } from "@/features/identity/components/users/users-table";
import { CreateUserButton } from "@/features/identity/components/users/create-user-dialog";

export const metadata: Metadata = { title: "Nhân viên & khách hàng" };

export default function UsersPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.userRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Nhân viên & khách hàng" description="Tài khoản đăng nhập, vai trò và quyền riêng">
          <CreateUserButton />
        </PageHeader>
        <UsersTable />
      </div>
    </PermissionGuard>
  );
}
