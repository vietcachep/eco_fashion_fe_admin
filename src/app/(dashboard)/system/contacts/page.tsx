import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ContactsTable } from "@/features/system/components/contacts/contacts-table";

export const metadata: Metadata = { title: "Liên hệ của khách" };

export default function ContactsTablePage() {
  return (
    <PermissionGuard permission={PERMISSIONS.contactRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Liên hệ của khách" description="Tin khách gửi SÀN (liên hệ chung, khiếu nại); tin gửi gian hàng chỉ để giám sát — shop tự trả lời" />
        <ContactsTable />
      </div>
    </PermissionGuard>
  );
}
