import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ToolsScreen } from "@/features/ai/components/tools/tools-screen";

export const metadata: Metadata = { title: "Công cụ soạn nội dung" };

export default function ToolsScreenPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.aiCopyCreate}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Công cụ soạn nội dung" description="Soạn mô tả sản phẩm / trả lời đánh giá / nội dung khuyến mãi, gợi ý phân loại" />
        <ToolsScreen />
      </div>
    </PermissionGuard>
  );
}
