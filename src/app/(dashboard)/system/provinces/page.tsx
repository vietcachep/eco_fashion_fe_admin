import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ProvincesTable } from "@/features/system/components/provinces/provinces-table";

export const metadata: Metadata = { title: "Tỉnh/thành & phí ship" };

export default function ProvincesTablePage() {
  return (
    <PermissionGuard permission={PERMISSIONS.provinceManage}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Tỉnh/thành & phí ship" description="Phí vận chuyển theo tỉnh và bật/tắt giao hàng" />
        <ProvincesTable />
      </div>
    </PermissionGuard>
  );
}
