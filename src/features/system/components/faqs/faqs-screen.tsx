"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormMessage } from "@/components/shared/form-message";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { PERMISSIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useDeleteFaq, useFaqs, useSaveFaq } from "@/features/system/hooks/use-system";
import { faqSchema, type FaqInput } from "@/features/system/schemas/content-schema";
import type { FaqResponse } from "@/features/system/types/system";

const LOAD_ERROR = "Không tải được FAQ.";

/* FAQ trang web, gom theo nhóm (groupCode). Thêm / sửa / xoá qua popup. */
export function FaqsScreen() {
  const { data, isPending, error } = useFaqs();
  const remove = useDeleteFaq();
  const [form, setForm] = useState<{ open: boolean; edit?: FaqResponse }>({ open: false });
  const [toDelete, setToDelete] = useState<FaqResponse | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, FaqResponse[]>();
    for (const f of data ?? []) {
      const arr = map.get(f.groupCode) ?? [];
      arr.push(f);
      map.set(f.groupCode, arr);
    }
    return [...map.entries()];
  }, [data]);

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <PermissionGate permission={PERMISSIONS.settingUpdate}>
          <Button onClick={() => setForm({ open: true })}>
            <PlusIcon className="size-4" />
            Thêm câu hỏi
          </Button>
        </PermissionGate>
      </div>
      {isPending ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : groups.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Chưa có câu hỏi.</p>
      ) : (
        groups.map(([group, faqs]) => (
          <Card key={group}>
            <CardHeader>
              <CardTitle className="text-base">{group || "Chung"}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y">
              {faqs
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((f) => (
                  <div key={f.id} className={cn("flex items-start gap-3 py-3 first:pt-0 last:pb-0", !f.isActive && "opacity-60")}>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{f.question}</p>
                      <p className="text-sm whitespace-pre-wrap text-muted-foreground">{f.answer}</p>
                    </div>
                    <StatusBadge tone={f.isActive ? "success" : "neutral"}>{f.isActive ? "Hiện" : "Ẩn"}</StatusBadge>
                    <PermissionGate permission={PERMISSIONS.settingUpdate}>
                      <Button variant="ghost" size="icon" className="size-8" title="Sửa" onClick={() => setForm({ open: true, edit: f })}>
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8 text-destructive" title="Xoá" onClick={() => setToDelete(f)}>
                        <Trash2Icon className="size-4" />
                      </Button>
                    </PermissionGate>
                  </div>
                ))}
            </CardContent>
          </Card>
        ))
      )}

      <FaqFormDialog open={form.open} onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))} faq={form.edit} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Xoá câu hỏi này?"
        confirmLabel="Xoá"
        destructive
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </div>
  );
}

function FaqFormDialog({ open, onOpenChange, faq }: { open: boolean; onOpenChange: (o: boolean) => void; faq?: FaqResponse }) {
  const save = useSaveFaq();
  const form = useForm<FaqInput>({
    resolver: zodResolver(faqSchema),
    defaultValues: { question: "", answer: "", groupCode: "", sortOrder: 0, isActive: true },
  });
  const errors = form.formState.errors;

  useEffect(() => {
    if (!open) return;
    form.reset(
      faq
        ? { question: faq.question, answer: faq.answer, groupCode: faq.groupCode, sortOrder: faq.sortOrder, isActive: faq.isActive }
        : { question: "", answer: "", groupCode: "", sortOrder: 0, isActive: true },
    );
  }, [open, faq, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{faq ? "Sửa câu hỏi" : "Thêm câu hỏi"}</DialogTitle>
        </DialogHeader>
        <form
          id="faq-form"
          noValidate
          onSubmit={form.handleSubmit((input) =>
            save.mutate(
              { id: faq?.id, body: { ...input, groupCode: input.groupCode || undefined } },
              { onSuccess: () => onOpenChange(false) },
            ),
          )}
        >
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="faq-q">Câu hỏi</FieldLabel>
              <Input id="faq-q" aria-invalid={!!errors.question} {...form.register("question")} />
              <FormMessage message={errors.question?.message} />
            </Field>
            <Field>
              <FieldLabel htmlFor="faq-a">Trả lời</FieldLabel>
              <Textarea id="faq-a" rows={5} aria-invalid={!!errors.answer} {...form.register("answer")} />
              <FormMessage message={errors.answer?.message} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="faq-group">Nhóm</FieldLabel>
                <Input id="faq-group" placeholder="shipping / returns…" {...form.register("groupCode")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="faq-sort">Thứ tự</FieldLabel>
                <Input id="faq-sort" type="number" min={0} {...form.register("sortOrder", { valueAsNumber: true })} />
              </Field>
              <Field>
                <FieldLabel>Hiển thị</FieldLabel>
                <label className="flex h-8 items-center gap-2 text-sm">
                  <Switch checked={form.watch("isActive")} onCheckedChange={(v) => form.setValue("isActive", v)} />
                  {form.watch("isActive") ? "Hiện" : "Ẩn"}
                </label>
              </Field>
            </div>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="submit" form="faq-form" disabled={save.isPending}>
            {save.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
