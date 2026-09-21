"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/shared/data-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { NativeSelect } from "@/components/shared/native-select";
import { StatCard } from "@/components/shared/stat-card";
import { isForbiddenError } from "@/lib/api-error";
import { formatDateTime, formatNumber } from "@/lib/format";
import { useChatInsights, useChatSessions } from "@/features/ai/hooks/use-ai-admin";
import { ChatTranscript } from "@/features/ai/components/chat-sessions/chat-transcript";
import type { ChatSessionRow } from "@/features/ai/types/ai";

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được hội thoại.";

/*
 * Hội thoại chatbot + "khách hỏi gì mà bot bí?": cụm câu hỏi thiếu dữ liệu và
 * tiêu đề bài kho tri thức nên viết (backend gom bằng embedding, cache 1h).
 */
export function ChatSessionsScreen() {
  const [pageIndex, setPageIndex] = useState(0);
  const [days, setDays] = useState(14);
  const [open, setOpen] = useState<ChatSessionRow | null>(null);
  const sessions = useChatSessions({ page: pageIndex + 1, size: PAGE_SIZE });
  const insights = useChatInsights(days);

  const columns: ColumnDef<ChatSessionRow>[] = useMemo(
    () => [
      { accessorKey: "title", header: "Phiên", cell: ({ row }) => <span className="font-medium">{row.original.title ?? "Không tiêu đề"}</span> },
      { id: "who", header: "Khách", cell: ({ row }) => (row.original.userId ? "Đã đăng nhập" : `Vãng lai ${row.original.guestKey ?? ""}`) },
      { accessorKey: "messageCount", header: "Tin nhắn", cell: ({ row }) => formatNumber(row.original.messageCount) },
      { accessorKey: "lastMessageAt", header: "Gần nhất", cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.lastMessageAt)}</span> },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="h-8" onClick={() => setOpen(row.original)}>
              Xem
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  if (isForbiddenError(sessions.error)) return <ApiErrorState error={sessions.error} fallback={LOAD_ERROR} />;
  const ins = insights.data;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Khách hỏi gì mà bot bí?</CardTitle>
          <NativeSelect aria-label="Khoảng ngày" className="w-32" value={String(days)} onChange={(e) => setDays(Number(e.target.value))}>
            {[7, 14, 30, 60].map((d) => (
              <option key={d} value={d}>
                {d} ngày
              </option>
            ))}
          </NativeSelect>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Phiên chat" value={formatNumber(ins?.sessions)} loading={insights.isPending} />
            <StatCard label="Câu hỏi" value={formatNumber(ins?.questions)} loading={insights.isPending} />
            <StatCard label="Bot bí" value={formatNumber(ins?.misses)} tone="warning" loading={insights.isPending} />
            <StatCard label="Chuyển người thật" value={formatNumber(ins?.handoffs)} tone="danger" loading={insights.isPending} />
            <StatCard label="Trả lời theo luật" value={formatNumber(ins?.ruleFallbacks)} loading={insights.isPending} />
          </div>
          {insights.isPending ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : ins?.clusters.length ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {ins.clusters.map((c) => (
                <li key={c.label} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">
                    {c.label} <span className="text-xs font-normal text-muted-foreground">× {c.count}</span>
                  </p>
                  <p className="text-xs text-primary">Nên viết: {c.suggestedTitle}</p>
                  <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                    {c.examples.slice(0, 3).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Chưa có câu hỏi nào bot bí trong khoảng này.</p>
          )}
          {ins ? (
            <p className="text-xs text-muted-foreground">
              {ins.generatedByAi ? "Gom cụm bằng AI" : "Gom theo từ khoá (chưa có OpenAI)"} · {formatDateTime(ins.generatedAt)}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {sessions.isError ? <ApiErrorState error={sessions.error} fallback={LOAD_ERROR} compact /> : null}
      <DataTable
        columns={columns}
        data={sessions.data?.content ?? []}
        loading={sessions.isLoading}
        serverPagination={{
          pageIndex,
          pageSize: PAGE_SIZE,
          pageCount: sessions.data?.totalPages || 1,
          total: sessions.data?.totalElements ?? 0,
          onPageChange: setPageIndex,
        }}
      />

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{open?.title ?? "Hội thoại"}</DialogTitle>
            <DialogDescription>Email / số điện thoại đã được che.</DialogDescription>
          </DialogHeader>
          {open ? <ChatTranscript sessionId={open.id} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
