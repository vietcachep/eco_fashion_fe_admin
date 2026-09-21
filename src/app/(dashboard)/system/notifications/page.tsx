import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { BroadcastForm } from "@/features/system/components/notifications/broadcast-form";

export const metadata: Metadata = { title: "Gửi thông báo" };

export default function BroadcastFormPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.notificationSend}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Gửi thông báo" description="Thông báo trong app tới khách đã chọn" />
        <BroadcastForm />
      </div>
    </PermissionGuard>
  );
}
