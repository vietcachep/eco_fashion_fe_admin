import type { Metadata } from "next";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { LiveContentReports } from "@/features/livestream/components/platform/live-content-reports";
export const metadata: Metadata = { title: "Báo cáo nội dung livestream" };
export default function Page() {
  return (
    <PermissionGuard permission={PERMISSIONS.liveReportRead}>
      <LiveContentReports />
    </PermissionGuard>
  );
}
