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
import { useContacts, useReplyContact, useShopContacts, useShopReplyContact } from "@/features/system/hooks/use-system";
import type { ContactResponse } from "@/features/system/types/system";

const TABS = [
  { key: "", label: "Tất cả" },
  { key: "new", label: "Mới" },
  { key: "handled", label: "Đã trả lời" },
] as const;

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được liên hệ.";
const DEFAULTS = { status: "", scope: "platform" };
const SCOPE_TABS = [
  { key: "platform", label: "Gửi sàn" },
  { key: "shops", label: "Gửi gian hàng (giám sát)" },
] as const;

/*
 * Liên hệ khách — trả lời qua email ngay tại đây. Hai cổng:
 *  - "platform" (sàn): tab "Gửi sàn" (form Liên hệ chung, khiếu nại) và "Gửi gian hàng" chỉ để giám sát — sàn không trả lời thay shop,
 *    trừ tin shop để quá 48 giờ chưa xử lý (`platformCanReply`).
 *  - "vendor" (shop): chỉ tin khách gửi CHÍNH shop mình (hỏi sản phẩm / đơn) — shop tự trả lời.
 */
export function ContactsTable({ mode = "platform" }: { mode?: "platform" | "vendor" }) {
  const vendor = mode === "vendor";
  const { filters, setFilter, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const [replying, setReplying] = useState<ContactResponse | null>(null);
  const platformQuery = useContacts({ status: filters.status, scope: filters.scope, page, size: PAGE_SIZE }, !vendor);
  const vendorQuery = useShopContacts({ status: filters.status, page, size: PAGE_SIZE }, vendor);
  const { data, isLoading, isError, error } = vendor ? vendorQuery : platformQuery;

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
            {row.original.shopName || row.original.orderCode || row.original.productName ? (
              <div className="mb-1 flex flex-wrap gap-1.5 text-xs">
                {row.original.shopName && !vendor ? <span className="rounded border px-1.5 py-0.5">Gửi shop: {row.original.shopName}</span> : null}
                {row.original.productName ? <span className="rounded bg-muted px-1.5 py-0.5">Sản phẩm: {row.original.productName}</span> : null}
                {row.original.orderCode ? <span className="rounded bg-muted px-1.5 py-0.5 font-mono">Đơn {row.original.orderCode}</span> : null}
              </div>
            ) : null}
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
          row.original.status === "new" && (vendor || row.original.platformCanReply) ? (
            <PermissionGate permission={vendor ? PERMISSIONS.shopContactReply : PERMISSIONS.contactReply}>
              <div className="flex justify-end">
                <Button size="sm" className="h-8" onClick={() => setReplying(row.original)}>
                  <ReplyIcon className="size-3.5" />
                  Trả lời
                </Button>
              </div>
            </PermissionGate>
          ) : row.original.status === "new" && !vendor ? (
            <span className="text-xs text-muted-foreground">Chờ shop trả lời</span>
          ) : null,
      },
    ],
    [vendor],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-3">
      {vendor ? null : <FilterTabs tabs={SCOPE_TABS} value={filters.scope} onChange={(v) => setFilter("scope", v)} />}
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
      <ReplyContactDialog contact={replying} vendor={vendor} onClose={() => setReplying(null)} />
    </div>
  );
}

function ReplyContactDialog({ contact, vendor, onClose }: { contact: ContactResponse | null; vendor: boolean; onClose: () => void }) {
  return (
    <Dialog open={!!contact} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {contact ? <ReplyContactBody key={contact.id} contact={contact} vendor={vendor} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ReplyContactBody({ contact, vendor, onClose }: { contact: ContactResponse; vendor: boolean; onClose: () => void }) {
  const platformReply = useReplyContact();
  const shopReply = useShopReplyContact();
  const reply = vendor ? shopReply : platformReply;
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
