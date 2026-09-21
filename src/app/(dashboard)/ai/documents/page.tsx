import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { DocumentsScreen } from "@/features/ai/components/documents/documents-screen";

export const metadata: Metadata = { title: "Kho tri thức chatbot" };

export default function DocumentsScreenPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.aiKnowledgeManage}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Kho tri thức chatbot" description="Chính sách, FAQ, hướng dẫn — chatbot trích dẫn khi trả lời khách (RAG)" />
        <DocumentsScreen />
      </div>
    </PermissionGuard>
  );
}
