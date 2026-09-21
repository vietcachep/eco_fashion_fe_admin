"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FilePicker } from "@/components/shared/file-picker";
import { FormMessage } from "@/components/shared/form-message";
import { NativeSelect } from "@/components/shared/native-select";
import { fromLocalInput, toLocalInput } from "@/lib/format";
import { useCreateBanner, useUpdateBanner } from "@/features/system/hooks/use-system";
import { bannerSchema, type BannerInput } from "@/features/system/schemas/banner-schema";
import type { BannerResponse } from "@/features/system/types/system";

/* Form banner: ảnh (bắt buộc khi tạo), tiêu đề, phụ đề, link, vị trí, thứ tự, lịch hiệu lực. */
export function BannerFormDialog({
  open,
  onOpenChange,
  banner,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banner?: BannerResponse;
}) {
  const create = useCreateBanner();
  const update = useUpdateBanner();
  const pending = create.isPending || update.isPending;
  const [file, setFile] = useState<File | null>(null);

  const empty: BannerInput = { title: "", subtitle: "", linkUrl: "", position: "hero", sortOrder: 0, isActive: true, startsAt: "", endsAt: "" };
  const form = useForm<BannerInput>({ resolver: zodResolver(bannerSchema), defaultValues: empty });
  const errors = form.formState.errors;

  useEffect(() => {
    if (!open) return;
    setFile(null);
    form.reset(
      banner
        ? {
            title: banner.title,
            subtitle: banner.subtitle ?? "",
            linkUrl: banner.linkUrl ?? "",
            position: banner.position as BannerInput["position"],
            sortOrder: banner.sortOrder,
            isActive: banner.isActive,
            startsAt: toLocalInput(banner.startsAt),
            endsAt: toLocalInput(banner.endsAt),
          }
        : empty,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `empty` là hằng
  }, [open, banner, form]);

  const submit = (input: BannerInput) => {
    const values = {
      title: input.title,
      subtitle: input.subtitle || "",
      linkUrl: input.linkUrl || "",
      position: input.position,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
      startsAt: fromLocalInput(input.startsAt) ?? null,
      endsAt: fromLocalInput(input.endsAt) ?? null,
    };
    const done = { onSuccess: () => onOpenChange(false) };
    if (banner) update.mutate({ id: banner.id, values, file }, done);
    else if (!file) toast.error("Chọn ảnh banner.");
    else create.mutate({ values, file }, done);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{banner ? "Sửa banner" : "Thêm banner"}</DialogTitle>
        </DialogHeader>
        <form id="banner-form" noValidate onSubmit={form.handleSubmit(submit)}>
          <FieldGroup className="gap-4">
            <FilePicker file={file} previewUrl={banner?.imageUrl} onChange={setFile} onError={(m) => toast.error(m)} label={banner ? "Đổi ảnh" : "Chọn ảnh"} previewClassName="h-16 w-28" />
            <Field>
              <FieldLabel htmlFor="bn-title">Tiêu đề</FieldLabel>
              <Input id="bn-title" aria-invalid={!!errors.title} {...form.register("title")} />
              <FormMessage message={errors.title?.message} />
            </Field>
            <Field>
              <FieldLabel htmlFor="bn-sub">Phụ đề</FieldLabel>
              <Input id="bn-sub" {...form.register("subtitle")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="bn-link">Link khi bấm</FieldLabel>
                <Input id="bn-link" placeholder="/products?category=dam" {...form.register("linkUrl")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="bn-pos">Vị trí</FieldLabel>
                <NativeSelect id="bn-pos" {...form.register("position")}>
                  <option value="hero">Hero</option>
                  <option value="promo">Khuyến mãi</option>
                </NativeSelect>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="bn-start">Hiện từ</FieldLabel>
                <Input id="bn-start" type="datetime-local" {...form.register("startsAt")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="bn-end">Đến</FieldLabel>
                <Input id="bn-end" type="datetime-local" {...form.register("endsAt")} />
                <FormMessage message={errors.endsAt?.message} />
              </Field>
              <Field>
                <FieldLabel htmlFor="bn-sort">Thứ tự</FieldLabel>
                <Input id="bn-sort" type="number" min={0} {...form.register("sortOrder", { valueAsNumber: true })} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.watch("isActive")} onCheckedChange={(v) => form.setValue("isActive", v)} />
              Đang hiện
            </label>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="submit" form="banner-form" disabled={pending}>
            {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {banner ? "Lưu" : "Tạo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
