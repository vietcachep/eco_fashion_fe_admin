import type { Metadata } from "next";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { LiveStudioScreen } from "@/features/livestream/components/studio/live-studio-screen";
export const metadata: Metadata = { title: "Studio FITLY Live" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopLiveRead}>
        <LiveStudioScreen key={id} id={id} />
      </PermissionGuard>
    </RoleGuard>
  );
}
