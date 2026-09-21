"use client";

import { useState } from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/shared/native-select";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PERMISSIONS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { SUPPORT_STATUS } from "@/lib/labels";
import { useDraftSupportReply, useUpdateSupport } from "@/features/ai/hooks/use-ai-admin";
import { ChatTranscript } from "@/features/ai/components/chat-sessions/chat-transcript";
import type { SupportRequestResponse } from "@/features/ai/types/ai";

/*
 * Popup xử lý một yêu cầu hỗ trợ: hội thoại chatbot, AI soạn nháp trả lời
 * (nhân viên tự gửi cho khách — module ai không gửi gì), đổi trạng thái +
 * ghi chú + nhận việc. Body có `key` theo id để state dựng mới mỗi yêu cầu.
 */
export function SupportDialog({ request, onClose }: { request: SupportRequestResponse | null; onClose: () => void }) {
  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        {request ? <SupportBody key={request.id} request={request} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function SupportBody({ request, onClose }: { request: SupportRequestResponse; onClose: () => void }) {
  const update = useUpdateSupport(request.id);
  const draft = useDraftSupportReply(request.id);
  const [status, setStatus] = useState(request.status);
  const [note, setNote] = useState(request.note ?? "");
  const [assignToMe, setAssignToMe] = useState(!request.assignedTo);
  const [reply, setReply] = useState("");

  return (
    <>
      <DialogHeader>
        <DialogTitle>Yêu cầu hỗ trợ</DialogTitle>
        <DialogDescription>
          {request.summary} · {request.email ?? "không có email"} · {formatDateTime(request.createdAt)}
        </DialogDescription>
      </DialogHeader>

      {request.sessionId ? (
        <div className="rounded-lg border">
          <p className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">Hội thoại với chatbot</p>
          <div className="max-h-64 overflow-y-auto p-3">
            <ChatTranscript sessionId={request.sessionId} />
          </div>
        </div>
      ) : null}

      <FieldGroup className="gap-4">
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="sp-reply">Nháp trả lời khách (tự gửi qua email / gọi điện)</FieldLabel>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-primary"
              disabled={draft.isPending}
              onClick={() => draft.mutate(undefined, { onSuccess: (r) => setReply(r.draft) })}
            >
              {draft.isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : <SparklesIcon className="size-3.5" />}
              AI soạn nháp
            </Button>
          </div>
          <Textarea id="sp-reply" rows={5} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Bấm 'AI soạn nháp' hoặc tự viết…" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="sp-status">Trạng thái</FieldLabel>
            <NativeSelect id="sp-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(SUPPORT_STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="sp-note">Ghi chú nội bộ</FieldLabel>
            <Textarea id="sp-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4" checked={assignToMe} onChange={(e) => setAssignToMe(e.target.checked)} />
          Nhận xử lý yêu cầu này
        </label>
      </FieldGroup>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Đóng
        </Button>
        <PermissionGate permission={PERMISSIONS.aiSupportResolve}>
          <Button
            disabled={update.isPending}
            onClick={() =>
              update.mutate(
                { status: status as "open" | "in_progress" | "resolved", note: note || undefined, assignToMe },
                { onSuccess: onClose },
              )
            }
          >
            {update.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Lưu
          </Button>
        </PermissionGate>
      </DialogFooter>
    </>
  );
}
