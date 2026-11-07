"use client";
import Link from "next/link";
import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { usePermission } from "@/hooks/use-permission";
import { formatDateTime, formatNumber } from "@/lib/format";
import { useLiveReport } from "../../hooks/use-livestream";
import { LiveSessionBadge } from "../sessions/live-session-badge";

export function LiveReportScreen({ id }: { id: string }) {
  const query = useLiveReport(id);
  const readSession = usePermission(PERMISSIONS.shopLiveRead);
  if (query.error)
    return (
      <ApiErrorState
        error={query.error}
        fallback="Không tải được dữ liệu phiên."
      />
    );
  const report = query.data;
  return (
    <div className="space-y-5">
      <PageHeader
        title={report?.session.title || "Dữ liệu livestream"}
        description="Số liệu từ phiên và đơn hàng thực tế, không bao gồm phòng phát thử."
      >
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCwIcon />
          Làm mới
        </Button>
        {readSession ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={ROUTES.vendor.livestreamStudio(id)} />}
          >
            Mở studio
          </Button>
        ) : null}
      </PageHeader>
      {report ? (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <LiveSessionBadge state={report.session.state} />
          <span>Bắt đầu {formatDateTime(report.session.startedAt)}</span>
          <span>Kết thúc {formatDateTime(report.session.endedAt)}</span>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Lượt vào xem"
          value={formatNumber(report?.views)}
          loading={query.isPending}
        />
        <StatCard
          label="Người xem duy nhất"
          value={formatNumber(report?.uniqueViewers)}
          loading={query.isPending}
        />
        <StatCard
          label="Kết nối đồng thời cao nhất"
          value={formatNumber(report?.peakViewers)}
          loading={query.isPending}
        />
        <StatCard
          label="Bình luận"
          value={formatNumber(report?.messageCount)}
          loading={query.isPending}
        />
        <StatCard
          label="Lượt tim"
          value={formatNumber(report?.likes)}
          loading={query.isPending}
        />
        <StatCard
          label="Lượt mở sản phẩm"
          value={formatNumber(report?.productClicks)}
          loading={query.isPending}
        />
      </div>
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="font-semibold">Đơn hàng và tiền</h2>
        {report?.commerce ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard
              label="Đơn được tạo"
              value={formatNumber(report.commerce.orders)}
            />
            <StatCard
              label="Đơn đã thanh toán"
              value={formatNumber(report.commerce.paidOrders)}
            />
            <StatCard
              label="Doanh thu đã ghi nhận"
              value={report.commerce.revenue.display}
            />
            <StatCard
              label="Tiền đã hoàn"
              value={report.commerce.refunded.display}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Chưa có số liệu đơn và thanh toán trong phản hồi của phiên. Báo cáo
            không suy ra doanh thu từ lượt xem hoặc lượt bấm mua.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Một người mở nhiều tab có thể tạo nhiều kết nối. Đơn huỷ, tiền hoàn và
          tiền chưa thu phải được đối chiếu theo trạng thái thanh toán.
        </p>
      </section>
    </div>
  );
}
