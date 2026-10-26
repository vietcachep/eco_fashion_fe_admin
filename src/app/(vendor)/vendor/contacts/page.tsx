import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ContactsTable } from "@/features/system/components/contacts/contacts-table";

export const metadata: Metadata = { title: "Tin nhắn khách" };

export default function VendorContactsPage() {
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopContactRead}>
        <div className="flex flex-col gap-4">
          <PageHeader title="Tin nhắn khách" description="Khách hỏi về sản phẩm / đơn của gian hàng bạn (nút “Hỏi shop”) — trả lời qua email ngay tại đây" />
          <ContactsTable mode="vendor" />
        </div>
      </PermissionGuard>
    </RoleGuard>
  );
}
