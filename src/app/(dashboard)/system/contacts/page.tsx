import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ContactsTable } from "@/features/system/components/contacts/contacts-table";

export const metadata: Metadata = { title: "Liên hệ của khách" };

export default function ContactsTablePage() {
  return (
    <PermissionGuard permission={PERMISSIONS.notificationSend}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Liên hệ của khách" description="Tin nhắn khách gửi từ form liên hệ — trả lời qua email" />
        <ContactsTable />
      </div>
    </PermissionGuard>
  );
}
