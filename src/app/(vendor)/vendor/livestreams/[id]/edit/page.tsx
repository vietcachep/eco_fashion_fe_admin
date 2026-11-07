import type { Metadata } from "next";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { LiveSessionEditor } from "@/features/livestream/components/sessions/live-session-editor";
export const metadata: Metadata = { title: "Sửa phiên livestream" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopLiveManage}>
        <LiveSessionEditor id={id} />
      </PermissionGuard>
    </RoleGuard>
  );
}
