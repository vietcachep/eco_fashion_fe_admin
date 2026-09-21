"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileTextIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FormMessage } from "@/components/shared/form-message";
import { PERMISSIONS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePermission } from "@/hooks/use-permission";
import { useSavePage, useStaticPages } from "@/features/system/hooks/use-system";
import { pageSchema, type PageInput } from "@/features/system/schemas/content-schema";

const LOAD_ERROR = "Không tải được trang tĩnh.";
const KNOWN: Record<string, string> = {
  about: "Giới thiệu",
  shipping: "Chính sách vận chuyển",
  "returns-policy": "Chính sách đổi trả",
  privacy: "Bảo mật",
  terms: "Điều khoản",
};

/*
 * Trang tĩnh (about · shipping · returns-policy · privacy · terms…): cột trái
 * danh sách slug, cột phải trình soạn Markdown. "Trang mới" cho phép nhập slug.
 */
export function PagesScreen() {
  const { data, isPending, error } = useStaticPages();
  const save = useSavePage();
  const canEdit = usePermission(PERMISSIONS.settingUpdate);
  const [picked, setPicked] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const selected = picked || data?.[0]?.slug || "";

  const form = useForm<PageInput>({
    resolver: zodResolver(pageSchema),
    defaultValues: { slug: "", title: "", content: "", isActive: true },
  });
  const errors = form.formState.errors;

  const current = data?.find((p) => p.slug === selected);
  useEffect(() => {
    if (creating) form.reset({ slug: "", title: "", content: "", isActive: true });
    else if (current) form.reset({ slug: current.slug, title: current.title, content: current.content, isActive: true });
  }, [current, creating, form]);

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;
  if (isPending) return <Skeleton className="h-96 w-full rounded-xl" />;

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
      <Card className="py-0">
        <CardContent className="flex flex-col gap-1 p-2">
          {(data ?? []).map((p) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => {
                setCreating(false);
                setPicked(p.slug);
              }}
              className={cn(
                "flex items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                !creating && p.slug === selected ? "bg-primary/10" : "hover:bg-muted",
              )}
            >
              <FileTextIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{p.title || KNOWN[p.slug] || p.slug}</span>
                <span className="block truncate text-xs text-muted-foreground">/{p.slug}</span>
              </span>
            </button>
          ))}
          {canEdit ? (
            <Button variant="outline" size="sm" className="mt-1" onClick={() => setCreating(true)}>
              <PlusIcon className="size-3.5" />
              Trang mới
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {creating ? "Trang mới" : current?.title || "—"}
            {current && !creating ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">cập nhật {formatDateTime(current.updatedAt)}</span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            noValidate
            onSubmit={form.handleSubmit((input) =>
              save.mutate(
                { slug: input.slug, body: { title: input.title, content: input.content, isActive: input.isActive } },
                {
                  onSuccess: () => {
                    setCreating(false);
                    setPicked(input.slug);
                  },
                },
              ),
            )}
          >
            <FieldGroup className="gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="pg-slug">Slug (đường dẫn)</FieldLabel>
                  <Input id="pg-slug" disabled={!creating} aria-invalid={!!errors.slug} {...form.register("slug")} />
                  <FormMessage message={errors.slug?.message} />
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="pg-title">Tiêu đề</FieldLabel>
                  <Input id="pg-title" disabled={!canEdit} aria-invalid={!!errors.title} {...form.register("title")} />
                  <FormMessage message={errors.title?.message} />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="pg-content">Nội dung (Markdown)</FieldLabel>
                <Textarea id="pg-content" rows={18} className="font-mono text-sm" disabled={!canEdit} aria-invalid={!!errors.content} {...form.register("content")} />
                <FormMessage message={errors.content?.message} />
              </Field>
              {canEdit ? (
                <div className="flex justify-end">
                  <Button type="submit" disabled={save.isPending}>
                    {save.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
                    Lưu trang
                  </Button>
                </div>
              ) : null}
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
