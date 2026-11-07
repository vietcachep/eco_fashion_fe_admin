import type { Metadata } from "next";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { LiveSessionsScreen } from "@/features/livestream/components/sessions/live-sessions-screen";
export const metadata: Metadata = { title: "Phiên livestream toàn sàn" };
export default function Page() {
  return (
    <PermissionGuard permission={PERMISSIONS.liveRead}>
      <LiveSessionsScreen platform />
    </PermissionGuard>
  );
}
