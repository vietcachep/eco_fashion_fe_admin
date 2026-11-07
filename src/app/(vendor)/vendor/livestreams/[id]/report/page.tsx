import type { Metadata } from "next";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { LiveReportScreen } from "@/features/livestream/components/reports/live-report-screen";
export const metadata: Metadata = { title: "Dữ liệu livestream" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopLiveReportRead}>
        <LiveReportScreen id={id} />
      </PermissionGuard>
    </RoleGuard>
  );
}
