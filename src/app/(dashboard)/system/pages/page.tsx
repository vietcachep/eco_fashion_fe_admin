import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { PagesScreen } from "@/features/system/components/pages/pages-screen";

export const metadata: Metadata = { title: "Trang tĩnh" };

export default function PagesScreenPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.settingRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Trang tĩnh" description="Giới thiệu, chính sách vận chuyển / đổi trả, bảo mật, điều khoản (Markdown)" />
        <PagesScreen />
      </div>
    </PermissionGuard>
  );
}
