"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2Icon, PencilIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/shared/data-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { FormMessage } from "@/components/shared/form-message";
import { NativeSelect } from "@/components/shared/native-select";
import { StatusBadge } from "@/components/shared/status-badge";
import { isForbiddenError } from "@/lib/api-error";
import { formatDateTime, formatNumber, truncate } from "@/lib/format";
import { AI_INDEX_STATUS, DOCUMENT_KIND_LABEL, statusMeta } from "@/lib/labels";
import { useListState } from "@/hooks/use-list-state";
import {
  useAiDocuments,
  useAiIndexStatus,
  useDeleteAiDocument,
  useRebuildAiIndex,
  useReindexAiDocument,
  useSaveAiDocument,
} from "@/features/ai/hooks/use-ai-admin";
import { documentSchema, type DocumentInput } from "@/features/ai/schemas/ai-schema";
import type { AiDocumentResponse } from "@/features/ai/types/ai";

const TABS = [
  { key: "", label: "Tất cả" },
  { key: "policy", label: "Chính sách" },
  { key: "faq", label: "FAQ" },
  { key: "guide", label: "Hướng dẫn" },
  { key: "product", label: "Sản phẩm" },
] as const;

const PAGE_SIZE = 12;
const LOAD_ERROR = "Không tải được kho tri thức.";
const DEFAULTS = { kind: "" };

/*
 * Kho tri thức chatbot (RAG): tài liệu → worker cắt đoạn + nhúng pgvector.
 * Thẻ trạng thái chỉ mục ở trên (tài liệu / sản phẩm / FAQ đã nhúng), bảng
 * tài liệu bên dưới với thêm / sửa / nhúng lại / xoá.
 */
export function DocumentsScreen() {
  const { filters, setFilter, search, setSearch, keyword, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const { data, isLoading, isError, error } = useAiDocuments({ keyword, kind: filters.kind, page, size: PAGE_SIZE });
  const remove = useDeleteAiDocument();
  const reindex = useReindexAiDocument();
  const [form, setForm] = useState<{ open: boolean; edit?: AiDocumentResponse }>({ open: false });
  const [toDelete, setToDelete] = useState<AiDocumentResponse | null>(null);

  const columns: ColumnDef<AiDocumentResponse>[] = useMemo(
    () => [
      {
        accessorKey: "title",
        header: "Tài liệu",
        cell: ({ row }) => (
          <div className="max-w-md leading-tight">
            <p className="font-medium">{row.original.title}</p>
            <p className="text-xs text-muted-foreground">{truncate(row.original.content, 100)}</p>
          </div>
        ),
      },
      { accessorKey: "kind", header: "Loại", cell: ({ row }) => <Badge variant="secondary">{DOCUMENT_KIND_LABEL[row.original.kind] ?? row.original.kind}</Badge> },
      {
        id: "index",
        header: "Chỉ mục",
        cell: ({ row }) => {
          const m = statusMeta(AI_INDEX_STATUS, row.original.status);
          return (
            <div className="leading-tight">
              <StatusBadge tone={m.tone}>{m.label}</StatusBadge>
              <p className="pt-0.5 text-xs text-muted-foreground">
                {formatNumber(row.original.chunkCount)} đoạn{row.original.error ? ` · ${row.original.error}` : ""}
              </p>
            </div>
          );
        },
      },
      { id: "active", header: "Dùng", cell: ({ row }) => <StatusBadge tone={row.original.isActive ? "success" : "neutral"}>{row.original.isActive ? "Đang dùng" : "Tắt"}</StatusBadge> },
      { accessorKey: "updatedAt", header: "Cập nhật", cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.updatedAt)}</span> },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" className="size-8" title="Nhúng lại" onClick={() => reindex.mutate(row.original.id)}>
              <RefreshCwIcon className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8" title="Sửa" onClick={() => setForm({ open: true, edit: row.original })}>
              <PencilIcon className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8 text-destructive" title="Xoá" onClick={() => setToDelete(row.original)}>
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [reindex],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-4">
      <IndexStatusCard />
      <FilterTabs tabs={TABS} value={filters.kind} onChange={(v) => setFilter("kind", v)} />
      {isError ? <ApiErrorState error={error} fallback={LOAD_ERROR} compact /> : null}
      <DataTable
        columns={columns}
        data={data?.content ?? []}
        loading={isLoading}
        searchPlaceholder="Tìm tiêu đề / nội dung…"
        searchValue={search}
        onSearchChange={setSearch}
        toolbar={
          <Button onClick={() => setForm({ open: true })}>
            <PlusIcon className="size-4" />
            Thêm tài liệu
          </Button>
        }
        serverPagination={{
          pageIndex,
          pageSize: PAGE_SIZE,
          pageCount: data?.totalPages || 1,
          total: data?.totalElements ?? 0,
          onPageChange: setPageIndex,
        }}
      />
      <DocumentFormDialog open={form.open} onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))} doc={form.edit} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Xoá "${toDelete?.title}"?`}
        description="Chatbot sẽ không còn dùng tài liệu này để trả lời."
        confirmLabel="Xoá"
        destructive
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </div>
  );
}

function IndexStatusCard() {
  const { data: s, isPending } = useAiIndexStatus();
  const rebuild = useRebuildAiIndex();
  if (isPending || !s) return <Skeleton className="h-20 w-full rounded-xl" />;
  const cell = (label: string, ready: number, total: number, extra?: string) => (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-lg font-semibold">
        {formatNumber(ready)}
        <span className="text-sm font-normal text-muted-foreground"> / {formatNumber(total)}</span>
      </p>
      {extra ? <p className="text-xs text-muted-foreground">{extra}</p> : null}
    </div>
  );
  return (
    <Card className="py-0">
      <CardContent className="flex flex-wrap items-center gap-6 p-4">
        {cell("Tài liệu đã nhúng", s.documents.ready, s.documents.total, `${formatNumber(s.documents.chunksWithVector)}/${formatNumber(s.documents.chunks)} đoạn có vector`)}
        {cell("Sản phẩm đã nhúng", s.products.ready, s.products.active, s.products.failed ? `${s.products.failed} lỗi` : undefined)}
        {cell("FAQ sản phẩm", s.faqs.ready, s.faqs.ready + s.faqs.pending + s.faqs.failed)}
        <div>
          <p className="text-xs text-muted-foreground">Tóm tắt đánh giá</p>
          <p className="font-heading text-lg font-semibold">{formatNumber(s.reviewSummaries)}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <StatusBadge tone={s.embeddingEnabled ? "success" : "warning"}>{s.embeddingEnabled ? "OpenAI đã cấu hình" : "Chưa có OpenAI key — chạy đường lùi"}</StatusBadge>
          <Button variant="outline" size="sm" disabled={rebuild.isPending || !s.embeddingEnabled} onClick={() => rebuild.mutate()}>
            {rebuild.isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : <RefreshCwIcon className="size-3.5" />}
            Nhúng lại toàn bộ
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentFormDialog({ open, onOpenChange, doc }: { open: boolean; onOpenChange: (o: boolean) => void; doc?: AiDocumentResponse }) {
  const save = useSaveAiDocument();
  const form = useForm<DocumentInput>({
    resolver: zodResolver(documentSchema),
    defaultValues: { title: "", kind: "policy", content: "", isActive: true },
  });
  const errors = form.formState.errors;
  useEffect(() => {
    if (!open) return;
    form.reset(doc ? { title: doc.title, kind: doc.kind as DocumentInput["kind"], content: doc.content, isActive: doc.isActive } : { title: "", kind: "policy", content: "", isActive: true });
  }, [open, doc, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{doc ? "Sửa tài liệu" : "Thêm tài liệu"}</DialogTitle>
        </DialogHeader>
        <form id="doc-form" noValidate onSubmit={form.handleSubmit((input) => save.mutate({ id: doc?.id, body: input }, { onSuccess: () => onOpenChange(false) }))}>
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
              <Field>
                <FieldLabel htmlFor="doc-title">Tiêu đề</FieldLabel>
                <Input id="doc-title" aria-invalid={!!errors.title} {...form.register("title")} />
                <FormMessage message={errors.title?.message} />
              </Field>
              <Field>
                <FieldLabel htmlFor="doc-kind">Loại</FieldLabel>
                <NativeSelect id="doc-kind" {...form.register("kind")}>
                  {Object.entries(DOCUMENT_KIND_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="doc-content">Nội dung (chatbot trích dẫn trực tiếp)</FieldLabel>
              <Textarea id="doc-content" rows={14} aria-invalid={!!errors.content} {...form.register("content")} />
              <FormMessage message={errors.content?.message} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.watch("isActive")} onCheckedChange={(v) => form.setValue("isActive", v)} />
              Cho chatbot dùng
            </label>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="submit" form="doc-form" disabled={save.isPending}>
            {save.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
