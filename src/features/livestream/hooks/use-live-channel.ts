"use client";
import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/auth-store";
import { useInvalidateLive } from "./use-livestream";

/* Socket chỉ vận chuyển tương tác. HTTP snapshot được nạp lại sau reconnect; lỗi chat không tháo kết nối video. */
export function useLiveChannel(sessionId: string, enabled = true) {
  const token = useAuthStore((s) => s.accessToken);
  const invalidate = useInvalidateLive();
  const refresh = useRef(invalidate);
  useEffect(() => {
    refresh.current = invalidate;
  }, [invalidate]);
  const connection = useRef<Socket | null>(null);
  const pendingMessage = useRef<{ body: string; id: string } | null>(null);
  const [status, setStatus] = useState("Chưa kết nối tương tác");
  useEffect(() => {
    if (!sessionId || !token || !enabled) return;
    let closed = false;
    let socket: Socket | undefined;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refreshSoon = () => {
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = undefined;
        void refresh.current();
      }, 250);
    };
    void import("socket.io-client").then(({ io }) => {
      if (closed) return;
      const origin =
        process.env.NEXT_PUBLIC_LIVE_SOCKET_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        window.location.origin;
      socket = io(`${origin.replace(/\/$/, "")}/live`, {
        transports: ["websocket"],
        auth: { token, sessionId },
        reconnectionAttempts: 8,
        timeout: 15_000,
      });
      connection.current = socket;
      socket.on("connect", () => {
        setStatus("Bình luận đã kết nối");
        void refresh.current();
      });
      socket.on("disconnect", () =>
        setStatus("Bình luận mất kết nối — có thể làm mới thủ công"),
      );
      socket.on("connect_error", () =>
        setStatus("Chưa kết nối được bình luận"),
      );
      for (const event of [
        "session.state_changed",
        "product.pinned",
        "message.accepted",
        "message.deleted",
        "viewer.count_changed",
        "moderation.changed",
        "campaign.updated",
      ])
        socket.on(event, refreshSoon);
    });
    return () => {
      closed = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      socket?.disconnect();
      if (connection.current === socket) connection.current = null;
    };
  }, [sessionId, token, enabled]);
  const send = (body: string) =>
    new Promise<void>((resolve, reject) => {
      const socket = connection.current;
      if (!socket?.connected) {
        reject(new Error("Bình luận mất kết nối. Kết nối lại rồi thử gửi."));
        return;
      }
      if (pendingMessage.current?.body !== body)
        pendingMessage.current = { body, id: crypto.randomUUID() };
      socket
        .timeout(10_000)
        .emit(
          "message.send",
          { clientMessageId: pendingMessage.current.id, body },
          (error: Error | null, result: { ok: boolean; message?: string }) => {
            if (error)
              reject(
                new Error(
                  "Chưa xác nhận được tin nhắn. Làm mới để kiểm tra trước khi gửi lại.",
                ),
              );
            else if (!result?.ok)
              reject(new Error(result?.message || "Không gửi được bình luận."));
            else {
              pendingMessage.current = null;
              resolve();
            }
          },
        );
    });
  return { status, send };
}
