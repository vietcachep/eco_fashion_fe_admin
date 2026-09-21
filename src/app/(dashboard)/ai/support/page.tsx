import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { SupportScreen } from "@/features/ai/components/support/support-screen";

export const metadata: Metadata = { title: "Yêu cầu hỗ trợ" };

export default function SupportScreenPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.aiSupportRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Yêu cầu hỗ trợ" description="Khách yêu cầu gặp người thật từ chatbot" />
        <SupportScreen />
      </div>
    </PermissionGuard>
  );
}
