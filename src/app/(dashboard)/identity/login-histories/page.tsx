import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { LoginHistoriesTable } from "@/features/identity/components/audit/login-histories-table";

export const metadata: Metadata = { title: "Lịch sử đăng nhập" };

export default function LoginHistoriesPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.auditRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Lịch sử đăng nhập" description="Lượt đăng nhập thành công / thất bại theo email, IP, thiết bị" />
        <LoginHistoriesTable />
      </div>
    </PermissionGuard>
  );
}
