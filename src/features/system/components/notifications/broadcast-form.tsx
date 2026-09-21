"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, SearchIcon, SendIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/shared/form-message";
import { InitialsAvatar } from "@/components/shared/initials-avatar";
import { useBroadcast } from "@/features/system/hooks/use-system";
import { useRecipientSearch } from "@/features/system/hooks/use-recipient-search";
import { broadcastSchema, type BroadcastInput } from "@/features/system/schemas/content-schema";

interface Recipient {
  id: string;
  name: string;
  email: string;
}

/*
 * Gửi thông báo trong app tới khách đã chọn (tìm theo tên/email, thêm từng
 * người). Backend nhận danh sách userIds — không có "gửi tất cả" để tránh
 * spam nhầm; muốn gửi nhiều thì chọn nhiều.
 */
export function BroadcastForm() {
  const broadcast = useBroadcast();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setKeyword(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  const { data, isFetching } = useRecipientSearch(keyword);

  const form = useForm<BroadcastInput>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: { title: "", content: "", link: "" },
  });
  const errors = form.formState.errors;

  const add = (r: Recipient) => setRecipients((prev) => (prev.some((x) => x.id === r.id) ? prev : [...prev, r]));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Người nhận ({recipients.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {recipients.map((r) => (
              <Badge key={r.id} variant="secondary" className="gap-1 font-normal">
                {r.name}
                <button type="button" aria-label={`Bỏ ${r.name}`} onClick={() => setRecipients((p) => p.filter((x) => x.id !== r.id))}>
                  <XIcon className="size-3" />
                </button>
              </Badge>
            ))}
            {recipients.length === 0 ? <p className="text-sm text-muted-foreground">Chưa chọn ai.</p> : null}
          </div>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Tìm khách theo tên / email / SĐT…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="max-h-72 overflow-y-auto rounded-lg border">
            {isFetching && !data ? (
              <div className="flex flex-col gap-2 p-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full rounded" />
                ))}
              </div>
            ) : (
              (data?.content ?? []).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => add({ id: u.id, name: u.fullName || u.email, email: u.email })}
                  className="flex w-full items-center gap-3 border-b px-3 py-2 text-left text-sm hover:bg-muted last:border-0"
                >
                  <InitialsAvatar name={u.fullName || u.email} src={u.avatarUrl ?? undefined} className="size-7" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{u.fullName || u.email}</span>
                    <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{u.roleName}</span>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nội dung thông báo</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            noValidate
            onSubmit={form.handleSubmit((input) =>
              broadcast.mutate(
                { userIds: recipients.map((r) => r.id), title: input.title, content: input.content || undefined, link: input.link || undefined },
                {
                  onSuccess: () => {
                    form.reset();
                    setRecipients([]);
                  },
                },
              ),
            )}
          >
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="bc-title">Tiêu đề</FieldLabel>
                <Input id="bc-title" aria-invalid={!!errors.title} {...form.register("title")} />
                <FormMessage message={errors.title?.message} />
              </Field>
              <Field>
                <FieldLabel htmlFor="bc-content">Nội dung</FieldLabel>
                <Textarea id="bc-content" rows={4} {...form.register("content")} />
                <FormMessage message={errors.content?.message} />
              </Field>
              <Field>
                <FieldLabel htmlFor="bc-link">Link khi bấm (tuỳ chọn)</FieldLabel>
                <Input id="bc-link" placeholder="/products?tag=sale" {...form.register("link")} />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" disabled={broadcast.isPending || recipients.length === 0}>
                  {broadcast.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
                  Gửi tới {recipients.length} người
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
