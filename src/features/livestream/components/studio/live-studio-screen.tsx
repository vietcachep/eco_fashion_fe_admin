"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CameraIcon,
  CameraOffIcon,
  MicIcon,
  MicOffIcon,
  RadioIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { NativeSelect } from "@/components/shared/native-select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { usePermission } from "@/hooks/use-permission";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { apiStatus, isForbiddenError } from "@/lib/api-error";
import { useLiveCommands, useLiveSession } from "../../hooks/use-livestream";
import { useHostMedia } from "../../hooks/use-host-media";
import { useLiveChannel } from "../../hooks/use-live-channel";
import { ACTIVE_LIVE } from "../../types/live";
import { LiveSessionBadge } from "../sessions/live-session-badge";
import { StudioProducts } from "./studio-products";
import { StudioChat } from "./studio-chat";
import { StudioCampaigns } from "./studio-campaigns";
import { StudioModerators } from "./studio-moderators";
import { LiveElapsed } from "./live-elapsed";
import { LiveVideoMonitor } from "../platform/live-video-monitor";

export function LiveStudioScreen({ id }: { id: string }) {
  const [activeId, setActiveId] = useState(id);
  const [tab, setTab] = useState("products");
  const [ending, setEnding] = useState(false);
  const query = useLiveSession(activeId);
  const commands = useLiveCommands();
  const {
    videoRef,
    status: mediaStatus,
    error: mediaError,
    busy: mediaBusy,
    previewing,
    micOn,
    cameraOn,
    devices,
    preview,
    connect: connectMedia,
    disconnect: disconnectMedia,
    toggle: toggleDevice,
    changeCamera,
    changeMicrophone,
  } = useHostMedia();
  const channel = useLiveChannel(activeId);
  const broadcast = usePermission(PERMISSIONS.shopLiveBroadcast);
  const manage = usePermission(PERMISSIONS.shopLiveManage);
  const moderate = usePermission(PERMISSIONS.shopLiveModerate);
  const report = usePermission(PERMISSIONS.shopLiveReportRead);
  const promotionManage = usePermission(PERMISSIONS.shopPromotionManage);
  const session = query.data;
  const active = !!session && ACTIVE_LIVE.has(session.state);
  const stopMedia = useRef(disconnectMedia);
  useEffect(() => {
    stopMedia.current = disconnectMedia;
  }, [disconnectMedia]);
  useEffect(() => {
    if (
      (session &&
        ["ended", "terminated", "cancelled"].includes(session.state)) ||
      isForbiddenError(query.error) ||
      apiStatus(query.error) === 404
    )
      void stopMedia.current();
  }, [session, query.error]);
  useEffect(() => {
    if (!active) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);
  const start = async (rehearsal: boolean) => {
    try {
      const grant = await commands.start.mutateAsync({ id, rehearsal });
      setActiveId(grant.session.id);
      await connectMedia(grant);
    } catch {
      /* Lỗi media và lệnh giữ riêng để người dùng sửa đúng phần. */
    }
  };
  const reconnect = async () => {
    try {
      await connectMedia(await commands.reconnect.mutateAsync(activeId));
    } catch {
      /* Lỗi được trình bày ở hai kênh. */
    }
  };
  if (
    query.error &&
    (!session ||
      isForbiddenError(query.error) ||
      apiStatus(query.error) === 404)
  )
    return (
      <ApiErrorState error={query.error} fallback="Không tải được studio." />
    );
  if (!session) return <Skeleton className="h-96 w-full rounded-xl" />;
  const terminal = ["ended", "terminated", "cancelled"].includes(session.state);
  const error =
    commands.start.error || commands.reconnect.error || commands.end.error;
  return (
    <div className="space-y-4">
      <PageHeader
        title={session.title}
        description={`${session.mode === "rehearsal" ? "Phát thử riêng — chỉ người được cấp quyền" : "Studio gian hàng"}${session.scheduledAt ? ` · Lịch ${formatDateTime(session.scheduledAt)}` : ""}`}
      >
        <div className="flex flex-wrap gap-2">
          <LiveSessionBadge state={session.state} />
          <LiveElapsed
            startedAt={session.startedAt}
            endedAt={session.endedAt}
            rehearsal={session.mode === "rehearsal"}
          />
          {report ? (
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link href={ROUTES.vendor.livestreamReport(session.id)} />
              }
            >
              Dữ liệu
            </Button>
          ) : null}
          {broadcast && active ? (
            <Button variant="destructive" onClick={() => setEnding(true)}>
              Kết thúc phiên
            </Button>
          ) : null}
        </div>
      </PageHeader>
      {query.error ? (
        <ApiErrorState
          compact
          error={query.error}
          fallback="Trạng thái chưa cập nhật được. Video vẫn giữ kết nối; hãy thử làm mới."
        />
      ) : null}
      {session.mode === "rehearsal" ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Đây là phiên thử riêng, không xuất hiện trên trang khách và không tạo
          đơn/voucher thật. Kết thúc thử trước khi phát công khai.
        </p>
      ) : null}
      {terminal ? (
        <div className="rounded-xl border p-4">
          <p className="text-sm">
            {session.endReason ||
              "Phiên đã được đóng. Bạn không thể phát lại với mã phiên này."}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Đường truyền:{" "}
            {session.mediaStopStatus === "confirmed"
              ? "Đã ngắt"
              : session.mediaStopStatus === "pending"
                ? "Đang chờ xác nhận ngắt"
                : session.mediaStopStatus === "failed"
                  ? "Chưa xác nhận ngắt, hệ thống sẽ đối soát"
                  : "Không hoạt động"}
          </p>
          <Button
            className="mt-3"
            variant="outline"
            nativeButton={false}
            render={<Link href={ROUTES.vendor.livestreamNew} />}
          >
            Tạo phiên mới
          </Button>
        </div>
      ) : null}
      {error ? (
        <ApiErrorState
          error={error}
          fallback="Chưa thực hiện được yêu cầu. Kiểm tra trạng thái rồi thử lại."
        />
      ) : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        {!broadcast && active ? (
          <LiveVideoMonitor sessionId={activeId} />
        ) : (
          <section className="overflow-hidden rounded-xl border bg-card">
            <div className="relative grid aspect-video max-h-[520px] place-items-center bg-zinc-950">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="h-full max-h-[520px] w-full object-contain"
              />
              {!previewing ? (
                <div className="absolute inset-0 grid place-content-center gap-3 p-5 text-center text-white/75">
                  <RadioIcon className="mx-auto size-8 text-primary" />
                  <p className="text-sm">
                    Kiểm tra hình và tiếng trước khi lên sóng
                  </p>
                  <p className="text-xs text-white/50">
                    Camera chỉ bật khi bạn bấm mở thiết bị
                  </p>
                </div>
              ) : null}
            </div>
            <div className="space-y-3 p-4">
              {session.mediaAvailable === false ? (
                <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  Dịch vụ video chưa sẵn sàng. Bạn có thể chuẩn bị sản phẩm và
                  kiểm tra camera; hãy liên hệ quản trị sàn trước khi bắt đầu
                  phát.
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground" role="status">
                  {mediaStatus}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session.viewerCount} kết nối đang xem ·{" "}
                  {session.mode === "rehearsal"
                    ? "Giới hạn 10 phút"
                    : "Giới hạn 60 phút"}
                </p>
              </div>
              {mediaError ? (
                <p
                  className="rounded-lg bg-destructive/5 p-3 text-sm text-destructive"
                  role="alert"
                >
                  {mediaError}
                </p>
              ) : null}
              {broadcast && !terminal ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={mediaBusy || active}
                      onClick={() => void preview()}
                    >
                      <CameraIcon />
                      Mở camera để xem thử
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!previewing}
                      onClick={() => void toggleDevice("audio")}
                    >
                      {micOn ? <MicIcon /> : <MicOffIcon />}
                      {micOn ? "Tắt mic" : "Bật mic"}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!previewing}
                      onClick={() => void toggleDevice("video")}
                    >
                      {cameraOn ? <CameraIcon /> : <CameraOffIcon />}
                      {cameraOn ? "Tắt camera" : "Bật camera"}
                    </Button>
                  </div>
                  {devices.some((d) => d.kind === "videoinput") ? (
                    <NativeSelect
                      aria-label="Camera đang dùng"
                      onChange={(e) => void changeCamera(e.target.value)}
                    >
                      <option value="">Chọn camera</option>
                      {devices
                        .filter((d) => d.kind === "videoinput")
                        .map((d, i) => (
                          <option key={d.deviceId} value={d.deviceId}>
                            {d.label || `Camera ${i + 1}`}
                          </option>
                        ))}
                    </NativeSelect>
                  ) : null}
                  {devices.some((d) => d.kind === "audioinput") ? (
                    <NativeSelect
                      aria-label="Microphone đang dùng"
                      onChange={(e) => void changeMicrophone(e.target.value)}
                    >
                      <option value="">Chọn microphone</option>
                      {devices
                        .filter((d) => d.kind === "audioinput")
                        .map((d, i) => (
                          <option key={d.deviceId} value={d.deviceId}>
                            {d.label || `Microphone ${i + 1}`}
                          </option>
                        ))}
                    </NativeSelect>
                  ) : null}
                  <div className="flex flex-wrap gap-2 border-t pt-3">
                    {active ? (
                      <Button
                        variant="outline"
                        disabled={mediaBusy || commands.reconnect.isPending}
                        onClick={() => void reconnect()}
                      >
                        <RefreshCwIcon />
                        Kết nối lại video
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          disabled={
                            mediaBusy ||
                            !previewing ||
                            commands.start.isPending ||
                            session.mediaAvailable === false ||
                            activeId !== id
                          }
                          onClick={() => void start(true)}
                        >
                          Phát thử riêng
                        </Button>
                        <Button
                          disabled={
                            mediaBusy ||
                            !previewing ||
                            commands.start.isPending ||
                            session.mediaAvailable === false ||
                            activeId !== id
                          }
                          onClick={() => void start(false)}
                        >
                          <RadioIcon />
                          Bắt đầu phát công khai
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => void query.refetch()}
                    >
                      <RefreshCwIcon />
                      Làm mới trạng thái
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          </section>
        )}
        <div className="hidden xl:block">
          <StudioChat
            session={session}
            canModerate={moderate && !!session.canModerate && !terminal}
            status={channel.status}
            send={channel.send}
          />
        </div>
      </div>
      <div
        className="flex flex-wrap gap-2 border-b pb-3"
        role="tablist"
        aria-label="Điều hành phiên"
      >
        {[
          ["products", "Sản phẩm"],
          ["chat", "Bình luận"],
          ["campaigns", "Ưu đãi"],
          ...(manage ? [["moderators", "Nhân viên điều hành"]] : []),
        ].map(([value, label]) => (
          <Button
            key={value}
            role="tab"
            aria-selected={tab === value}
            variant={tab === value ? "default" : "outline"}
            onClick={() => setTab(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      {tab === "products" ? (
        <StudioProducts session={session} canManage={manage && !terminal} />
      ) : tab === "chat" ? (
        <div className="max-w-2xl xl:hidden">
          <StudioChat
            session={session}
            canModerate={moderate && !!session.canModerate && !terminal}
            status={channel.status}
            send={channel.send}
          />
        </div>
      ) : tab === "moderators" && manage ? (
        <StudioModerators sessionId={session.id} />
      ) : (
        <StudioCampaigns
          sessionId={session.id}
          canManage={manage && promotionManage && session.mode === "public"}
          canCreate={["draft", "scheduled", "live"].includes(session.state)}
        />
      )}
      <ConfirmDialog
        open={ending}
        onOpenChange={setEnding}
        title="Kết thúc livestream?"
        description="Tất cả người xem sẽ nhận trạng thái kết thúc. Đơn hàng và thanh toán đang xử lý vẫn tiếp tục theo quy trình hiện tại."
        confirmLabel="Kết thúc phiên"
        destructive
        onConfirm={() =>
          commands.end.mutate(activeId, {
            onSuccess: () => {
              void disconnectMedia();
              if (activeId !== id) setActiveId(id);
            },
          })
        }
      />
    </div>
  );
}
