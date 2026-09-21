"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useChatSession } from "@/features/ai/hooks/use-ai-admin";

/*
 * Hội thoại một phiên chatbot (đã che email/SĐT phía backend). Dùng ở màn
 * hội thoại và trong dialog yêu cầu hỗ trợ. Hiện tool đã gọi + cờ guard để
 * nhân viên hiểu vì sao bot trả lời như vậy.
 */
export function ChatTranscript({ sessionId }: { sessionId: string }) {
  const { data, isPending, error } = useChatSession(sessionId);
  if (error) return <ApiErrorState error={error} fallback="Không tải được hội thoại." compact />;
  if (isPending || !data) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className={cn("h-10 w-2/3 rounded-lg", i % 2 ? "self-end" : "")} />
        ))}
      </div>
    );
  }
  if (data.messages.length === 0) return <p className="text-sm text-muted-foreground">Phiên trống.</p>;
  return (
    <ol className="flex flex-col gap-2">
      {data.messages.map((m, i) => {
        const user = m.role === "user";
        return (
          <li key={i} className={cn("flex flex-col gap-1", user ? "items-end" : "items-start")}>
            <div className={cn("max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap", user ? "bg-primary text-primary-foreground" : "bg-muted")}>
              {m.text}
            </div>
            <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
              <span>{user ? "Khách" : "Trợ lý"}</span>
              <span>· {formatDateTime(m.createdAt)}</span>
              {!user && m.source ? <span>· {m.source}</span> : null}
              {m.tools.map((t) => (
                <Badge key={t} variant="outline" className="h-4 px-1 text-[10px]">
                  {t}
                </Badge>
              ))}
              {m.guard ? (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  guard: {m.guard}
                </Badge>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
