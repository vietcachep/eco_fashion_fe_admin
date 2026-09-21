import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { AuditLogsTable } from "@/features/identity/components/audit/audit-logs-table";

export const metadata: Metadata = { title: "Nhật ký thao tác" };

export default function AuditLogsPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.auditRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Nhật ký thao tác" description="Thay đổi tài khoản, vai, quyền — ai làm, lúc nào, trước/sau" />
        <AuditLogsTable />
      </div>
    </PermissionGuard>
  );
}
