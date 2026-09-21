import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { FaqsScreen } from "@/features/system/components/faqs/faqs-screen";

export const metadata: Metadata = { title: "Câu hỏi thường gặp" };

export default function FaqsScreenPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.settingRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Câu hỏi thường gặp" description="FAQ hiện trên web và chatbot dùng để trả lời" />
        <FaqsScreen />
      </div>
    </PermissionGuard>
  );
}
