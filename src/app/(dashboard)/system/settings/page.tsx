import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { SettingsScreen } from "@/features/system/components/settings/settings-screen";

export const metadata: Metadata = { title: "Tham số vận hành" };

export default function SettingsScreenPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.settingRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Tham số vận hành" description="Tên shop, hotline, ngưỡng freeship, hạn thanh toán… — web bán hàng đọc các tham số công khai" />
        <SettingsScreen />
      </div>
    </PermissionGuard>
  );
}
