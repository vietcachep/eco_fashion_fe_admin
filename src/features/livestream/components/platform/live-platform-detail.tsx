"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { usePermission } from "@/hooks/use-permission";
import { PERMISSIONS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { useLiveCommands, useLiveSession } from "../../hooks/use-livestream";
import { ACTIVE_LIVE } from "../../types/live";
import { LiveSessionBadge } from "../sessions/live-session-badge";
import { LiveVideoMonitor } from "./live-video-monitor";
import { StudioCampaigns } from "../studio/studio-campaigns";

export function LivePlatformDetail({ id }: { id: string }) {
  const query = useLiveSession(id, true);
  const commands = useLiveCommands();
  const terminate = usePermission(PERMISSIONS.liveTerminate);
  const restrict = usePermission(PERMISSIONS.liveRestrict);
  const promotionManage = usePermission(PERMISSIONS.promotionManage);
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<
    "terminate" | "restrict" | "unrestrict" | null
  >(null);
  if (query.error)
    return (
      <ApiErrorState
        error={query.error}
        fallback="Không tải được phiên livestream."
      />
    );
  if (!query.data) return <Skeleton className="h-80 w-full" />;
  const session = query.data;
  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader
        title={session.title}
        description={`Gian hàng ${session.shop?.name || "không còn khả dụng"}`}
      >
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Làm mới trạng thái
        </Button>
      </PageHeader>
      <div className="space-y-3 rounded-xl border bg-card p-5">
        <LiveSessionBadge state={session.state} />
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Lịch / bắt đầu</dt>
            <dd>{formatDateTime(session.startedAt || session.scheduledAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Kết thúc</dt>
            <dd>{formatDateTime(session.endedAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Đang xem</dt>
            <dd>{session.viewerCount}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Ngắt đường truyền</dt>
            <dd>
              {
                {
                  none: "Chưa yêu cầu",
                  pending: "Đang ngắt — chờ hãng xác nhận",
                  confirmed: "Đã ngắt",
                  failed: "Chưa xác nhận ngắt — cần thử lại",
                }[session.mediaStopStatus]
              }
            </dd>
          </div>
        </dl>
        {session.endReason ? (
          <p className="rounded-lg bg-muted/50 p-3 text-sm">
            Lý do: {session.endReason}
          </p>
        ) : null}
      </div>
      {session.mode === "public" && ACTIVE_LIVE.has(session.state) ? (
        <LiveVideoMonitor key={session.id} sessionId={session.id} />
      ) : null}
      {terminate || restrict ? (
        <section className="space-y-3 rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Xử lý phiên và quyền phát</h2>
          <label className="block space-y-1 text-sm">
            Lý do xử lý
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              minLength={10}
              maxLength={1000}
              placeholder="Nhập lý do cụ thể, ít nhất 10 ký tự"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {terminate &&
            (ACTIVE_LIVE.has(session.state) ||
              ["pending", "failed"].includes(session.mediaStopStatus)) ? (
              <Button
                variant="destructive"
                disabled={
                  reason.trim().length < 10 || commands.terminate.isPending
                }
                onClick={() => setAction("terminate")}
              >
                Buộc dừng phiên
              </Button>
            ) : null}
            {restrict ? (
              <>
                <Button
                  variant="destructive"
                  disabled={
                    reason.trim().length < 10 || commands.restrict.isPending
                  }
                  onClick={() => setAction("restrict")}
                >
                  Khoá quyền livestream của shop
                </Button>
                <Button
                  variant="outline"
                  disabled={
                    reason.trim().length < 10 || commands.restrict.isPending
                  }
                  onClick={() => setAction("unrestrict")}
                >
                  Mở quyền livestream
                </Button>
              </>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Khoá quyền livestream khác khoá gian hàng. Các đơn đã tạo không tự
            huỷ và khoản tiền không tự hoàn chỉ vì dừng video.
          </p>
          {commands.terminate.error || commands.restrict.error ? (
            <ApiErrorState
              error={commands.terminate.error || commands.restrict.error}
              fallback="Không thực hiện được xử lý."
            />
          ) : null}
        </section>
      ) : null}
      <StudioCampaigns
        sessionId={id}
        platform
        canManage={promotionManage}
        canCreate={["draft", "scheduled", "live"].includes(session.state)}
      />
      <ConfirmDialog
        open={!!action}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
        title={
          action === "terminate"
            ? "Buộc dừng phiên này?"
            : action === "restrict"
              ? "Khoá quyền livestream?"
              : "Mở quyền livestream?"
        }
        description={
          action === "terminate"
            ? "Hệ thống ngừng cấp quyền mới và yêu cầu ngắt đường truyền. Trạng thái chỉ được coi là đã ngắt khi dịch vụ video xác nhận."
            : "Thao tác được ghi lịch sử cùng lý do đã nhập. Quyền bán hàng và đơn hàng được quản lý theo luồng riêng."
        }
        destructive={action !== "unrestrict"}
        confirmLabel="Xác nhận xử lý"
        onConfirm={() => {
          if (action === "terminate") commands.terminate.mutate({ id, reason });
          else if (action)
            commands.restrict.mutate({
              shopId: session.shopId,
              restricted: action === "restrict",
              reason,
            });
        }}
      />
    </div>
  );
}
