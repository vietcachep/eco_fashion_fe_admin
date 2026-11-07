"use client";
import { useEffect, useRef, useState } from "react";
import type { Room } from "livekit-client";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/api-error";
import { useLiveMonitorTransport } from "../../hooks/use-livestream";

/* Quan sát bằng token chỉ xem, không yêu cầu camera của nhân viên. Heartbeat chỉ chạy trong thời gian đang xem. */
export function LiveVideoMonitor({ sessionId }: { sessionId: string }) {
  const { viewerGrant, heartbeat, leave } = useLiveMonitorTransport();
  const video = useRef<HTMLVideoElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const room = useRef<Room | null>(null);
  const admission = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const generation = useRef(0);
  const [status, setStatus] = useState("Chưa mở video");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  useEffect(
    () => () => {
      generation.current++;
      if (timer.current) clearInterval(timer.current);
      void room.current?.disconnect();
      if (admission.current)
        void leave(sessionId, admission.current).catch(() => undefined);
    },
    [sessionId, leave],
  );
  const stop = async () => {
    generation.current++;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    await room.current?.disconnect();
    room.current = null;
    if (admission.current)
      void leave(sessionId, admission.current).catch(() => undefined);
    admission.current = null;
    setConnected(false);
    setStatus("Đã đóng video");
  };
  const open = async () => {
    const current = ++generation.current;
    setBusy(true);
    setError(null);
    setStatus("Đang kết nối video…");
    try {
      const grant = await viewerGrant(sessionId);
      if (generation.current !== current) {
        void leave(sessionId, grant.admissionId).catch(() => undefined);
        return;
      }
      admission.current = grant.admissionId;
      const sdk = await import("livekit-client");
      if (generation.current !== current) return;
      const next = new sdk.Room({ adaptiveStream: true });
      room.current = next;
      next.on(sdk.RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === "video" && video.current)
          track.attach(video.current);
        if (track.kind === "audio" && audio.current)
          track.attach(audio.current);
      });
      next.on(sdk.RoomEvent.ConnectionStateChanged, (state) => {
        if (generation.current === current)
          setStatus(
            state === "connected"
              ? "Video đã kết nối"
              : state === "reconnecting"
                ? "Video đang kết nối lại…"
                : "Video đã ngắt",
          );
      });
      next.on(sdk.RoomEvent.Disconnected, () => {
        if (generation.current !== current) return;
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        if (admission.current)
          void leave(sessionId, admission.current).catch(() => undefined);
        admission.current = null;
        setConnected(false);
        setStatus(
          "Video đã ngắt. Bạn có thể kết nối lại nếu phiên vẫn đang phát.",
        );
      });
      await next.connect(grant.serverUrl, grant.token);
      if (generation.current !== current) {
        await next.disconnect();
        return;
      }
      setConnected(true);
      timer.current = setInterval(() => {
        void heartbeat(sessionId, grant.admissionId).catch(() => undefined);
      }, 20_000);
    } catch (e) {
      await room.current?.disconnect();
      if (admission.current)
        void leave(sessionId, admission.current).catch(() => undefined);
      admission.current = null;
      if (generation.current === current)
        setError(
          apiErrorMessage(
            e,
            e instanceof Error
              ? e.message
              : "Không xem được video. Kiểm tra trạng thái phiên và thử lại.",
          ),
        );
    } finally {
      if (generation.current === current) setBusy(false);
    }
  };
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="relative aspect-video bg-zinc-950">
        <video
          ref={video}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-contain"
        />
        <audio ref={audio} autoPlay muted={muted} />
        {!connected ? (
          <div className="absolute inset-0 grid place-items-center text-sm text-white/60">
            Mở video để kiểm tra nội dung đang phát
          </div>
        ) : null}
      </div>
      <div className="space-y-3 p-4">
        <p className="text-xs text-muted-foreground" role="status">
          {status}
        </p>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {connected ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setMuted(!muted);
                  if (audio.current) {
                    audio.current.muted = !muted;
                    if (muted)
                      void audio.current
                        .play()
                        .catch(() =>
                          setError(
                            "Trình duyệt chưa phát tiếng. Bấm bật tiếng lần nữa.",
                          ),
                        );
                  }
                }}
              >
                {muted ? "Bật tiếng" : "Tắt tiếng"}
              </Button>
              <Button variant="outline" onClick={() => void stop()}>
                Đóng video
              </Button>
            </>
          ) : (
            <Button disabled={busy} onClick={() => void open()}>
              {busy ? "Đang mở…" : "Xem video trực tiếp"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
