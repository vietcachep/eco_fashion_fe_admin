import type { Metadata } from "next";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { LivePlatformDetail } from "@/features/livestream/components/platform/live-platform-detail";
export const metadata: Metadata = { title: "Chi tiết phiên livestream" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PermissionGuard permission={PERMISSIONS.liveRead}>
      <LivePlatformDetail id={id} />
    </PermissionGuard>
  );
}
