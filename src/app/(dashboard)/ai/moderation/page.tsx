import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ModerationScreen } from "@/features/ai/components/moderation/moderation-screen";

export const metadata: Metadata = { title: "Kiểm duyệt AI" };

export default function ModerationScreenPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.aiModerationRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Kiểm duyệt AI" description="Nhãn AI đề xuất cho đánh giá — quyết định ẩn/hiện ở màn Đánh giá" />
        <ModerationScreen />
      </div>
    </PermissionGuard>
  );
}
