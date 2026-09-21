"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormMessage } from "@/components/shared/form-message";
import { NativeSelect } from "@/components/shared/native-select";
import { GENDER_LABEL } from "@/lib/labels";
import { useAdminCategories } from "@/features/catalog/hooks/use-categories";
import { useCreateCollection, useUpdateCollection } from "@/features/catalog/hooks/use-collections";
import { collectionSchema, type CollectionInput } from "@/features/catalog/schemas/collection-schema";
import type { CollectionAdminResponse } from "@/lib/api/generated/model";

/* Form tạo / sửa bộ sưu tập: tên, tagline, bộ lọc ngành/giới/tag, thứ tự, hiện/ẩn. */
export function CollectionFormDialog({
  open,
  onOpenChange,
  collection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection?: CollectionAdminResponse;
}) {
  const { data: categories } = useAdminCategories();
  const create = useCreateCollection();
  const update = useUpdateCollection();
  const pending = create.isPending || update.isPending;

  const empty: CollectionInput = {
    name: "",
    slug: "",
    tagline: "",
    queryCategorySlug: "",
    queryGender: "",
    queryTag: "",
    sortOrder: 0,
    isActive: true,
  };
  const form = useForm<CollectionInput>({ resolver: zodResolver(collectionSchema), defaultValues: empty });
  const errors = form.formState.errors;

  useEffect(() => {
    if (!open) return;
    form.reset(
      collection
        ? {
            name: collection.name,
            slug: collection.slug,
            tagline: collection.tagline ?? "",
            queryCategorySlug: collection.query.category ?? "",
            queryGender: (collection.query.gender as CollectionInput["queryGender"]) ?? "",
            queryTag: collection.query.tag ?? "",
            sortOrder: collection.sortOrder,
            isActive: collection.isActive,
          }
        : empty,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `empty` là hằng
  }, [open, collection, form]);

  const submit = (input: CollectionInput) => {
    const gender = input.queryGender || undefined;
    const done = { onSuccess: () => onOpenChange(false) };
    if (collection) {
      update.mutate(
        {
          id: collection.id,
          body: {
            name: input.name,
            slug: input.slug || undefined,
            tagline: input.tagline || null,
            queryCategorySlug: input.queryCategorySlug || null,
            queryGender: gender,
            queryTag: input.queryTag || null,
            sortOrder: input.sortOrder,
            isActive: input.isActive,
          },
        },
        done,
      );
    } else {
      create.mutate(
        {
          name: input.name,
          slug: input.slug || undefined,
          tagline: input.tagline || undefined,
          queryCategorySlug: input.queryCategorySlug || undefined,
          queryGender: gender,
          queryTag: input.queryTag || undefined,
          sortOrder: input.sortOrder,
          isActive: input.isActive,
        },
        done,
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{collection ? "Sửa bộ sưu tập" : "Thêm bộ sưu tập"}</DialogTitle>
        </DialogHeader>
        <form id="collection-form" noValidate onSubmit={form.handleSubmit(submit)}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="col-name">Tên</FieldLabel>
              <Input id="col-name" aria-invalid={!!errors.name} {...form.register("name")} />
              <FormMessage message={errors.name?.message} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="col-slug">Slug (để trống = tự sinh)</FieldLabel>
                <Input id="col-slug" aria-invalid={!!errors.slug} {...form.register("slug")} />
                <FormMessage message={errors.slug?.message} />
              </Field>
              <Field>
                <FieldLabel htmlFor="col-tagline">Tagline</FieldLabel>
                <Input id="col-tagline" placeholder="Đồ hè mát mẻ" {...form.register("tagline")} />
                <FormMessage message={errors.tagline?.message} />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">Bộ lọc — bỏ trống mục nào thì không lọc theo mục đó.</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="col-cat">Ngành hàng</FieldLabel>
                <NativeSelect id="col-cat" {...form.register("queryCategorySlug")}>
                  <option value="">— Tất cả —</option>
                  {(categories ?? []).map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="col-gender">Giới</FieldLabel>
                <NativeSelect id="col-gender" {...form.register("queryGender")}>
                  <option value="">— Tất cả —</option>
                  {Object.entries(GENDER_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="col-tag">Tag</FieldLabel>
                <Input id="col-tag" placeholder="new, sale…" {...form.register("queryTag")} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="col-sort">Thứ tự</FieldLabel>
                <Input id="col-sort" type="number" min={0} {...form.register("sortOrder", { valueAsNumber: true })} />
              </Field>
              <Field>
                <FieldLabel>Hiển thị</FieldLabel>
                <label className="flex h-8 items-center gap-2 text-sm">
                  <Switch checked={form.watch("isActive")} onCheckedChange={(v) => form.setValue("isActive", v)} />
                  {form.watch("isActive") ? "Đang hiện" : "Đang ẩn"}
                </label>
              </Field>
            </div>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="submit" form="collection-form" disabled={pending}>
            {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {collection ? "Lưu" : "Tạo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
