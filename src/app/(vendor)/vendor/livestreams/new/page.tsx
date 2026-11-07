import type { Metadata } from "next";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { LiveSessionEditor } from "@/features/livestream/components/sessions/live-session-editor";
export const metadata: Metadata = { title: "Tạo phiên livestream" };
export default function Page() {
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopLiveManage}>
        <LiveSessionEditor />
      </PermissionGuard>
    </RoleGuard>
  );
}
