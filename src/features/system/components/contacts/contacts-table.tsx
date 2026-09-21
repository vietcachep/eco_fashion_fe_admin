"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2Icon, ReplyIcon } from "lucide-react";
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
import { DataTable } from "@/components/shared/data-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { isForbiddenError } from "@/lib/api-error";
import { PERMISSIONS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { CONTACT_STATUS, statusMeta } from "@/lib/labels";
import { useListState } from "@/hooks/use-list-state";
import { useContacts, useReplyContact } from "@/features/system/hooks/use-system";
import type { ContactResponse } from "@/features/system/types/system";

const TABS = [
  { key: "", label: "Tất cả" },
  { key: "new", label: "Mới" },
  { key: "handled", label: "Đã trả lời" },
] as const;

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được liên hệ.";
const DEFAULTS = { status: "" };

/* Liên hệ khách gửi từ web (form /contact) — trả lời qua email ngay tại đây. */
export function ContactsTable() {
  const { filters, setFilter, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const [replying, setReplying] = useState<ContactResponse | null>(null);
  const { data, isLoading, isError, error } = useContacts({ status: filters.status, page, size: PAGE_SIZE });

  const columns: ColumnDef<ContactResponse>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Khách",
        cell: ({ row }) => (
          <div className="leading-tight">
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.email}
              {row.original.phone ? ` · ${row.original.phone}` : ""}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "message",
        header: "Nội dung",
        cell: ({ row }) => (
          <div className="max-w-md">
            <p className="text-sm whitespace-pre-wrap">{row.original.message}</p>
            {row.original.reply ? <p className="mt-1 rounded bg-muted px-2 py-1 text-xs">↳ {row.original.reply}</p> : null}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const m = statusMeta(CONTACT_STATUS, row.original.status);
          return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
        },
      },
      { accessorKey: "createdAt", header: "Gửi lúc", cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.createdAt)}</span> },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) =>
          row.original.status === "new" ? (
            <PermissionGate permission={PERMISSIONS.notificationSend}>
              <div className="flex justify-end">
                <Button size="sm" className="h-8" onClick={() => setReplying(row.original)}>
                  <ReplyIcon className="size-3.5" />
                  Trả lời
                </Button>
              </div>
            </PermissionGate>
          ) : null,
      },
    ],
    [],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-3">
      <FilterTabs tabs={TABS} value={filters.status} onChange={(v) => setFilter("status", v)} />
      {isError ? <ApiErrorState error={error} fallback={LOAD_ERROR} compact /> : null}
      <DataTable
        columns={columns}
        data={data?.content ?? []}
        loading={isLoading}
        serverPagination={{
          pageIndex,
          pageSize: PAGE_SIZE,
          pageCount: data?.totalPages || 1,
          total: data?.totalElements ?? 0,
          onPageChange: setPageIndex,
        }}
      />
      <ReplyContactDialog contact={replying} onClose={() => setReplying(null)} />
    </div>
  );
}

function ReplyContactDialog({ contact, onClose }: { contact: ContactResponse | null; onClose: () => void }) {
  return (
    <Dialog open={!!contact} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {contact ? <ReplyContactBody key={contact.id} contact={contact} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ReplyContactBody({ contact, onClose }: { contact: ContactResponse; onClose: () => void }) {
  const reply = useReplyContact();
  const [text, setText] = useState("");
  return (
    <>
      <DialogHeader>
        <DialogTitle>Trả lời {contact.name}</DialogTitle>
        <DialogDescription>Gửi email tới {contact.email}.</DialogDescription>
      </DialogHeader>
      <p className="rounded-md bg-muted px-3 py-2 text-sm whitespace-pre-wrap">{contact.message}</p>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="ct-reply">Nội dung trả lời</FieldLabel>
          <Textarea id="ct-reply" rows={5} value={text} onChange={(e) => setText(e.target.value)} maxLength={3000} />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button disabled={reply.isPending || text.trim().length < 2} onClick={() => reply.mutate({ id: contact.id, reply: text.trim() }, { onSuccess: onClose })}>
          {reply.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Gửi email
        </Button>
      </DialogFooter>
    </>
  );
}
