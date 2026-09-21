import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { InsightsScreen } from "@/features/ai/components/insights/insights-screen";

export const metadata: Metadata = { title: "Nhận xét vận hành" };

export default function InsightsScreenPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.aiInsightRead}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Nhận xét vận hành" description="AI nhận xét doanh thu, tồn kho, combo từ số liệu thật; hỏi số liệu bằng ngôn ngữ tự nhiên" />
        <InsightsScreen />
      </div>
    </PermissionGuard>
  );
}
