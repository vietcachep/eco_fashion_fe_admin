import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ChatSessionsScreen } from "@/features/ai/components/chat-sessions/chat-sessions-screen";

export const metadata: Metadata = { title: "Hội thoại chatbot" };

export default function ChatSessionsScreenPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.aiChatRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Hội thoại chatbot" description="Phiên chat của khách (đã che thông tin cá nhân) và câu hỏi bot chưa trả lời được" />
        <ChatSessionsScreen />
      </div>
    </PermissionGuard>
  );
}
