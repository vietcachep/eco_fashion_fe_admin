import type { Metadata } from "next";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { LiveSessionsScreen } from "@/features/livestream/components/sessions/live-sessions-screen";
export const metadata: Metadata = { title: "Livestream của shop" };
export default function Page() {
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopLiveRead}>
        <LiveSessionsScreen />
      </PermissionGuard>
    </RoleGuard>
  );
}
