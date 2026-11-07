"use client";
import { useState } from "react";
import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useLiveCommands, useLiveMessages } from "../../hooks/use-livestream";
import type { LiveMessage, LiveSession } from "../../types/live";

export function StudioChat({
  session,
  canModerate,
  status,
  send,
}: {
  session: LiveSession;
  canModerate: boolean;
  status: string;
  send: (body: string) => Promise<void>;
}) {
  const query = useLiveMessages(session.id);
  const commands = useLiveCommands();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mute, setMute] = useState<LiveMessage | null>(null);
  const submit = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await send(body.trim());
      setBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không gửi được bình luận.");
    } finally {
      setSending(false);
    }
  };
  return (
    <section className="flex h-full min-h-96 flex-col rounded-xl border bg-card">
      <div className="border-b p-3">
        <h2 className="font-semibold">Bình luận</h2>
        <p className="text-xs text-muted-foreground" role="status">
          {status}
        </p>
      </div>
      {query.error ? (
        <div className="p-3">
          <ApiErrorState
            compact
            error={query.error}
            fallback="Không tải được bình luận."
          />
          <Button
            className="mt-2"
            variant="outline"
            onClick={() => void query.refetch()}
          >
            Làm mới bình luận
          </Button>
        </div>
      ) : null}
      <div className="flex-1 space-y-3 overflow-y-auto p-3 lg:max-h-[470px]">
        {query.isPending ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-3/4" />
          </>
        ) : null}
        {query.data
          ?.filter((m) => !m.deleted)
          .map((m) => (
            <div
              key={m.id}
              className={`rounded-lg p-2 ${session.pinnedMessageId === m.id ? "border border-primary/30 bg-primary/5" : "bg-muted/30"}`}
            >
              <p className="text-xs font-medium">
                {m.displayName}
                {session.pinnedMessageId === m.id ? " · Đã ghim" : ""}
              </p>
              <p className="mt-1 break-words whitespace-pre-wrap text-sm">
                {m.body}
              </p>
              {canModerate ? (
                <div className="mt-1 flex flex-wrap gap-3 text-xs">
                  <button
                    className="text-primary hover:underline"
                    onClick={() =>
                      commands.moderate.mutate({
                        id: session.id,
                        data: {
                          action:
                            session.pinnedMessageId === m.id
                              ? "unpin_message"
                              : "pin_message",
                          messageId: m.id,
                        },
                      })
                    }
                  >
                    {session.pinnedMessageId === m.id ? "Bỏ ghim" : "Ghim"}
                  </button>
                  <button
                    className="text-destructive hover:underline"
                    onClick={() =>
                      commands.moderate.mutate({
                        id: session.id,
                        data: { action: "delete_message", messageId: m.id },
                      })
                    }
                  >
                    Xoá
                  </button>
                  <button
                    className="text-muted-foreground hover:underline"
                    onClick={() => setMute(m)}
                  >
                    Cấm bình luận
                  </button>
                  <button
                    className="text-muted-foreground hover:underline"
                    onClick={() =>
                      commands.moderate.mutate({
                        id: session.id,
                        data: { action: "unmute", userId: m.userId },
                      })
                    }
                  >
                    Bỏ cấm
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        {!query.isPending && !query.data?.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Bình luận của khách sẽ hiện ở đây.
          </p>
        ) : null}
      </div>
      <div className="space-y-2 border-t p-3">
        {commands.moderate.error ? (
          <ApiErrorState
            compact
            error={commands.moderate.error}
            fallback="Không xử lý được bình luận."
          />
        ) : null}
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Textarea
          disabled={sending}
          aria-label="Bình luận của shop"
          maxLength={300}
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Trả lời khách hàng…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {body.length}/300
          </span>
          <Button
            disabled={sending || !body.trim()}
            onClick={() => void submit()}
          >
            <SendIcon />
            {sending ? "Đang gửi…" : "Gửi"}
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={!!mute}
        onOpenChange={(open) => {
          if (!open) setMute(null);
        }}
        title={`Cấm bình luận của ${mute?.displayName || "người xem"}?`}
        description="Người này không thể bình luận thêm trong phiên này. Bạn có thể bỏ cấm sau."
        confirmLabel="Cấm trong phiên"
        destructive
        onConfirm={() => {
          if (mute)
            commands.moderate.mutate({
              id: session.id,
              data: {
                action: "mute",
                userId: mute.userId,
                reason: "Vi phạm nội quy bình luận trong phiên",
              },
            });
        }}
      />
    </section>
  );
}
