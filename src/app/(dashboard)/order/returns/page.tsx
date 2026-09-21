import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ReturnsTable } from "@/features/order/components/returns/returns-table";

export const metadata: Metadata = { title: "Yêu cầu đổi trả" };

export default function ReturnsPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.returnRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Yêu cầu đổi trả" description="Khách gửi trong hạn đổi trả; duyệt → kế toán hoàn tiền" />
        <ReturnsTable />
      </div>
    </PermissionGuard>
  );
}
