"use client";
import { useEffect, useRef, useState } from "react";
import type {
  LocalAudioTrack,
  LocalTrack,
  LocalVideoTrack,
  Room,
} from "livekit-client";
import type { HostGrant } from "../types/live";

/* SDK tải sau hành động của host. Một bộ track dùng cho preview và publish; đóng room/track khi rời màn để trả camera. */
export function useHostMedia() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const room = useRef<Room | null>(null);
  const tracks = useRef<LocalTrack[]>([]);
  const generation = useRef(0);
  const [status, setStatus] = useState("Chưa mở camera");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  useEffect(
    () => () => {
      generation.current++;
      void room.current?.disconnect();
      tracks.current.forEach((t) => {
        t.detach();
        t.stop();
      });
    },
    [],
  );
  const capture = async () => {
    const current = generation.current;
    const sdk = await import("livekit-client");
    if (current !== generation.current) throw new Error("Đã đóng studio.");
    const created = await sdk.createLocalTracks({
      audio: true,
      video: {
        resolution: sdk.VideoPresets.h720.resolution,
        facingMode: "user",
      },
    });
    if (current !== generation.current) {
      created.forEach((t) => t.stop());
      throw new Error("Đã đóng studio.");
    }
    tracks.current.forEach((t) => {
      t.detach();
      t.stop();
    });
    tracks.current = created;
    const video = created.find((t) => t.kind === "video");
    if (video && videoRef.current) video.attach(videoRef.current);
    const devices = await navigator.mediaDevices.enumerateDevices();
    if (current !== generation.current) return;
    setDevices(devices);
    setPreviewing(true);
    setMicOn(true);
    setCameraOn(true);
  };
  const preview = async () => {
    setBusy(true);
    setError(null);
    try {
      await capture();
      setStatus("Camera sẵn sàng — chưa phát công khai");
    } catch (e) {
      setError(deviceError(e));
    } finally {
      setBusy(false);
    }
  };
  const connect = async (grant: HostGrant) => {
    const current = generation.current;
    setBusy(true);
    setError(null);
    setStatus("Đang kết nối đường truyền…");
    try {
      if (!tracks.current.length) await capture();
      const sdk = await import("livekit-client");
      room.current?.removeAllListeners();
      await room.current?.disconnect(false);
      if (current !== generation.current) return;
      const next = new sdk.Room({ adaptiveStream: true, dynacast: true });
      room.current = next;
      next.on(sdk.RoomEvent.ConnectionStateChanged, (state) => {
        if (current === generation.current)
          setStatus(
            state === "connected"
              ? "Đã kết nối video"
              : state === "reconnecting"
                ? "Video đang kết nối lại…"
                : state === "disconnected"
                  ? "Video đã ngắt"
                  : "Đang kết nối video…",
          );
      });
      next.on(sdk.RoomEvent.MediaDevicesError, (e) => {
        if (current === generation.current) setError(deviceError(e));
      });
      next.on(sdk.RoomEvent.Disconnected, () => {
        if (room.current !== next) return;
        tracks.current.forEach((t) => {
          t.detach();
          t.stop();
        });
        tracks.current = [];
        if (current === generation.current) setPreviewing(false);
      });
      await next.connect(grant.serverUrl, grant.token);
      if (current !== generation.current) {
        await next.disconnect();
        return;
      }
      for (const track of tracks.current)
        await next.localParticipant.publishTrack(track);
      setStatus(
        grant.session.mode === "rehearsal"
          ? "Đang phát thử riêng"
          : "Đã gửi hình và tiếng đến phiên live",
      );
    } catch (e) {
      await room.current?.disconnect();
      setError(deviceError(e));
      setStatus("Chưa kết nối được video");
      throw e;
    } finally {
      if (current === generation.current) setBusy(false);
    }
  };
  const disconnect = async () => {
    generation.current++;
    await room.current?.disconnect();
    room.current = null;
    tracks.current.forEach((t) => {
      t.detach();
      t.stop();
    });
    tracks.current = [];
    setPreviewing(false);
    setStatus("Đã ngắt camera và đường truyền");
  };
  const toggle = async (kind: "audio" | "video") => {
    const track = tracks.current.find((t) => t.kind === kind);
    if (!track) return;
    try {
      if (track.isMuted) await track.unmute();
      else await track.mute();
      if (kind === "audio") setMicOn(!track.isMuted);
      else setCameraOn(!track.isMuted);
    } catch (e) {
      setError(deviceError(e));
    }
  };
  const changeCamera = async (id: string) => {
    if (!id) return;
    const video = tracks.current.find((t) => t.kind === "video") as
      | LocalVideoTrack
      | undefined;
    if (video)
      try {
        await video.restartTrack({ deviceId: { exact: id } });
      } catch (e) {
        setError(deviceError(e));
      }
  };
  const changeMicrophone = async (id: string) => {
    if (!id) return;
    const audio = tracks.current.find((t) => t.kind === "audio") as
      | LocalAudioTrack
      | undefined;
    if (audio)
      try {
        await audio.restartTrack({ deviceId: { exact: id } });
      } catch (e) {
        setError(deviceError(e));
      }
  };
  return {
    videoRef,
    status,
    error,
    busy,
    previewing,
    micOn,
    cameraOn,
    devices,
    preview,
    connect,
    disconnect,
    toggle,
    changeCamera,
    changeMicrophone,
  };
}

function deviceError(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError")
    return "Camera hoặc micro chưa được cho phép. Mở quyền thiết bị trên trình duyệt rồi thử lại.";
  if (name === "NotFoundError")
    return "Không tìm thấy camera hoặc micro. Kết nối thiết bị rồi thử lại.";
  if (name === "NotReadableError")
    return "Thiết bị đang bị ứng dụng khác sử dụng. Đóng ứng dụng đó rồi thử lại.";
  return error instanceof Error
    ? error.message
    : "Không kết nối được hình và tiếng. Kiểm tra thiết bị và đường truyền.";
}
