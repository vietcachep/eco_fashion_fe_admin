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
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/shared/form-message";
import { NativeSelect } from "@/components/shared/native-select";
import { useCreateCategory, useUpdateCategory } from "@/features/catalog/hooks/use-categories";
import { categorySchema, type CategoryInput } from "@/features/catalog/schemas/category-schema";
import type { CategoryAdminResponse } from "@/lib/api/generated/model";

/*
 * Form tạo / sửa ngành hàng. `parentId` truyền sẵn khi bấm "Thêm ngành con".
 * Khi sửa, không cho chọn chính nó hoặc con cháu của nó làm cha (tránh vòng).
 */
export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  parentId,
  all,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryAdminResponse;
  parentId?: string;
  all: CategoryAdminResponse[];
}) {
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const pending = create.isPending || update.isPending;

  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", slug: "", description: "", parentId: parentId ?? "", sortOrder: 0, isActive: true },
  });
  const errors = form.formState.errors;

  useEffect(() => {
    if (!open) return;
    form.reset(
      category
        ? {
            name: category.name,
            slug: category.slug,
            description: category.description ?? "",
            parentId: category.parentId ?? "",
            sortOrder: category.sortOrder,
            isActive: category.isActive,
          }
        : { name: "", slug: "", description: "", parentId: parentId ?? "", sortOrder: 0, isActive: true },
    );
  }, [open, category, parentId, form]);

  // Loại chính nó + con cháu khỏi danh sách cha.
  const excluded = new Set<string>();
  if (category) {
    const stack = [category.id];
    while (stack.length) {
      const id = stack.pop()!;
      excluded.add(id);
      for (const c of all) if (c.parentId === id) stack.push(c.id);
    }
  }
  const parents = all.filter((c) => !excluded.has(c.id));

  const submit = (input: CategoryInput) => {
    const body = {
      name: input.name,
      slug: input.slug || undefined,
      description: input.description || (category ? null : undefined),
      parentId: input.parentId || null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    };
    const done = { onSuccess: () => onOpenChange(false) };
    if (category) update.mutate({ id: category.id, body }, done);
    else create.mutate({ ...body, description: input.description || undefined }, done);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{category ? "Sửa ngành hàng" : "Thêm ngành hàng"}</DialogTitle>
        </DialogHeader>
        <form id="category-form" noValidate onSubmit={form.handleSubmit(submit)}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="cat-name">Tên ngành hàng</FieldLabel>
              <Input id="cat-name" aria-invalid={!!errors.name} {...form.register("name")} />
              <FormMessage message={errors.name?.message} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="cat-slug">Slug (để trống = tự sinh)</FieldLabel>
                <Input id="cat-slug" placeholder="ao-thun" aria-invalid={!!errors.slug} {...form.register("slug")} />
                <FormMessage message={errors.slug?.message} />
              </Field>
              <Field>
                <FieldLabel htmlFor="cat-parent">Ngành cha</FieldLabel>
                <NativeSelect id="cat-parent" {...form.register("parentId")}>
                  <option value="">— Ngành gốc —</option>
                  {parents.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="cat-desc">Mô tả</FieldLabel>
              <Textarea id="cat-desc" rows={3} {...form.register("description")} />
              <FormMessage message={errors.description?.message} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="cat-sort">Thứ tự</FieldLabel>
                <Input id="cat-sort" type="number" min={0} {...form.register("sortOrder", { valueAsNumber: true })} />
                <FormMessage message={errors.sortOrder?.message} />
              </Field>
              <Field>
                <FieldLabel>Hiển thị trên web</FieldLabel>
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
          <Button type="submit" form="category-form" disabled={pending}>
            {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {category ? "Lưu" : "Tạo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
