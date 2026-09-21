import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { UsageScreen } from "@/features/ai/components/usage/usage-screen";

export const metadata: Metadata = { title: "Chi phí & hạn mức AI" };

export default function UsageScreenPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.aiUsageRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Chi phí & hạn mức AI" description="Token, chi phí theo ngày / tính năng, hiệu quả dải gợi ý" />
        <UsageScreen />
      </div>
    </PermissionGuard>
  );
}
