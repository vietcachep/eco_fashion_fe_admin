"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { FilePicker } from "@/components/shared/file-picker";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { ROUTES } from "@/lib/constants";
import { fromLocalInput, toLocalInput } from "@/lib/format";
import {
  useLiveCommands,
  useLiveProducts,
  useLiveSession,
} from "../../hooks/use-livestream";
import { useLiveCoverUpload } from "../../hooks/use-live-cover-upload";
import {
  sessionSchema,
  type SessionFormValues,
} from "../../schemas/session-schema";
import type { LiveSession } from "../../types/live";
import type { ProductCardResponse } from "@/lib/api/generated/model";
import { LiveProductSelector } from "./live-product-selector";

export function LiveSessionEditor({ id }: { id?: string }) {
  const query = useLiveSession(id || "");
  const products = useLiveProducts(id || "");
  if (id && (query.error || products.error))
    return (
      <ApiErrorState
        error={query.error || products.error}
        fallback="Không tải được phiên để chỉnh sửa."
      />
    );
  if (id && (!query.data || !products.data))
    return <Skeleton className="h-96 w-full rounded-xl" />;
  if (query.data && !["draft", "scheduled"].includes(query.data.state))
    return (
      <div className="space-y-4">
        <PageHeader
          title="Phiên đã bắt đầu"
          description="Thông tin phiên đã phát được giữ trong lịch sử. Mở studio để điều hành."
        />
        <Button
          nativeButton={false}
          render={<Link href={ROUTES.vendor.livestreamStudio(id!)} />}
        >
          Mở studio
        </Button>
      </div>
    );
  return (
    <EditorBody
      key={`${id || "new"}-${query.data?.version ?? 0}`}
      session={query.data}
      initialProducts={products.data?.content.map((p) => p.card) ?? []}
    />
  );
}

function EditorBody({
  session,
  initialProducts,
}: {
  session?: LiveSession;
  initialProducts: ProductCardResponse[];
}) {
  const router = useRouter();
  const commands = useLiveCommands();
  const upload = useLiveCoverUpload();
  const [selected, setSelected] = useState(initialProducts);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);
  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      title: session?.title ?? "",
      description: session?.description ?? "",
      coverUrl: session?.coverUrl ?? "",
      scheduledAt: toLocalInput(session?.scheduledAt),
    },
  });
  const coverUrl = useWatch({ control: form.control, name: "coverUrl" });
  const dirty = form.formState.isDirty || changed;
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    if (dirty) window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const save = form.handleSubmit(async (values) => {
    setError(null);
    if (!selected.length) {
      setError("Chọn ít nhất một sản phẩm để chuẩn bị phiên live.");
      return;
    }
    try {
      const result = await commands.save.mutateAsync({
        id: session?.id,
        version: session?.version,
        data: {
          title: values.title,
          description: values.description,
          coverUrl: values.coverUrl || null,
          scheduledAt: fromLocalInput(values.scheduledAt) || null,
          productIds: selected.map((p) => p.id),
        },
      });
      setChanged(false);
      form.reset(values);
      router.push(ROUTES.vendor.livestreamStudio(result.id));
    } catch {
      /* Lỗi server giữ nguyên form và được hiển thị bên dưới. */
    }
  });
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title={session ? "Sửa phiên livestream" : "Chuẩn bị livestream"}
        description="Lưu thông tin và sản phẩm trước; camera chỉ bật khi bạn kiểm thiết bị trong studio."
      />
      <form onSubmit={(e) => void save(e)} className="space-y-5">
        <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
          <h2 className="font-semibold">Thông tin phiên</h2>
          <label className="block space-y-1.5 text-sm">
            Tên phiên
            <Input
              {...form.register("title")}
              maxLength={120}
              placeholder="Ví dụ: Chọn đồ đi làm cùng FITLY"
            />
            {form.formState.errors.title ? (
              <span className="text-destructive">
                {form.formState.errors.title.message}
              </span>
            ) : null}
          </label>
          <label className="block space-y-1.5 text-sm">
            Mô tả
            <Textarea
              {...form.register("description")}
              rows={3}
              placeholder="Giới thiệu những món bạn sẽ lên sóng"
            />
            {form.formState.errors.description ? (
              <span className="text-destructive">
                {form.formState.errors.description.message}
              </span>
            ) : null}
          </label>
          <div className="space-y-2">
            <p className="text-sm">Ảnh bìa</p>
            <FilePicker
              file={null}
              previewUrl={coverUrl}
              onChange={(file) => {
                if (file)
                  void upload
                    .mutateAsync(file)
                    .then((r) => {
                      form.setValue("coverUrl", r.url, { shouldDirty: true });
                    })
                    .catch(() => undefined);
              }}
              onError={setError}
              label={upload.isPending ? "Đang tải ảnh…" : "Tải ảnh bìa"}
            />
            {coverUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={upload.isPending}
                onClick={() =>
                  form.setValue("coverUrl", "", { shouldDirty: true })
                }
              >
                Gỡ ảnh bìa
              </Button>
            ) : null}
            {upload.error ? (
              <ApiErrorState
                compact
                error={upload.error}
                fallback="Không tải được ảnh bìa."
              />
            ) : null}
          </div>
          <label className="block space-y-1.5 text-sm">
            Lịch phát (để trống nếu muốn mở studio ngay)
            <Input type="datetime-local" {...form.register("scheduledAt")} />
            {form.formState.errors.scheduledAt ? (
              <span className="text-destructive">
                {form.formState.errors.scheduledAt.message}
              </span>
            ) : null}
            <span className="block text-xs text-muted-foreground">
              Giờ Việt Nam. Tới giờ, bạn vẫn cần chủ động mở camera và bắt đầu.
            </span>
          </label>
        </section>
        <div className="rounded-xl border bg-card p-4 sm:p-6">
          <LiveProductSelector
            selected={selected}
            onChange={(next) => {
              setSelected(next);
              setChanged(true);
            }}
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {commands.save.error ? (
          <ApiErrorState
            error={commands.save.error}
            fallback="Không lưu được phiên. Thông tin bạn nhập vẫn được giữ."
          />
        ) : null}
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (
                !dirty ||
                window.confirm("Thông tin chưa lưu. Bạn muốn rời trang?")
              )
                router.push(ROUTES.vendor.livestreams);
            }}
          >
            Quay lại
          </Button>
          <Button
            type="submit"
            disabled={commands.save.isPending || upload.isPending}
          >
            {commands.save.isPending ? "Đang lưu…" : "Lưu và mở studio"}
          </Button>
        </div>
      </form>
    </div>
  );
}
