"use client";

import { useForm, useWatch } from "react-hook-form";
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
import { ATTRIBUTE_MODE, statusMeta } from "@/lib/labels";
import { formatNumber } from "@/lib/format";
import { useCreateCategory, useUpdateCategory } from "@/features/catalog/hooks/use-categories";
import { categorySchema, type CategoryAttributeMode, type CategoryInput } from "@/features/catalog/schemas/category-schema";
import type { CategoryAdminResponse } from "@/lib/api/generated/model";

const MODE_HINT: Record<CategoryAttributeMode, string> = {
  dynamic:
    "Ngành dùng Mẫu thuộc tính riêng (điện tử, gia dụng, mỹ phẩm…). Gán mẫu sau khi tạo, ở nút “Mẫu thuộc tính” trên danh sách ngành.",
  legacy_fashion:
    "Thời trang cũ: dùng bộ giới tính / chất liệu / màu / size cố định của sàn — không có Mẫu thuộc tính.",
};

/* Chế độ hiện tại của ngành → giá trị form (mã lạ coi như dynamic, mặc định của backend). */
function modeOf(category?: CategoryAdminResponse): CategoryAttributeMode {
  return category?.attributeMode === "legacy_fashion" ? "legacy_fashion" : "dynamic";
}

/*
 * Form tạo / sửa ngành hàng. `parentId` truyền sẵn khi bấm "Thêm ngành con".
 * Khi sửa, không cho chọn chính nó hoặc con cháu của nó làm cha (tránh vòng).
 * Thân form tách riêng: Dialog gỡ nội dung khi đóng nên mỗi lần mở là form mới với giá trị khởi tạo từ
 * props — không cần effect reset.
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <CategoryFormBody
          key={category?.id ?? `new:${parentId ?? ""}`}
          category={category}
          parentId={parentId}
          all={all}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function CategoryFormBody({
  category,
  parentId,
  all,
  onClose,
}: {
  category?: CategoryAdminResponse;
  parentId?: string;
  all: CategoryAdminResponse[];
  onClose: () => void;
}) {
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const pending = create.isPending || update.isPending;

  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      description: category?.description ?? "",
      parentId: category ? (category.parentId ?? "") : (parentId ?? ""),
      sortOrder: category?.sortOrder ?? 0,
      isActive: category?.isActive ?? true,
      attributeMode: modeOf(category),
    },
  });
  const errors = form.formState.errors;
  const mode = useWatch({ control: form.control, name: "attributeMode" });
  const isActive = useWatch({ control: form.control, name: "isActive" });

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

  // Ngành đã có sản phẩm → backend khoá đổi chế độ (409 CATALOG_CATEGORY_MODE_LOCKED); nói trước thay vì để người dùng đụng lỗi.
  const modeLocked = !!category && category.productCount > 0;
  const hasChildren = !!category && all.some((c) => c.parentId === category.id);

  const submit = (input: CategoryInput) => {
    const common = {
      name: input.name,
      slug: input.slug || undefined,
      parentId: input.parentId || null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    };
    const done = { onSuccess: onClose };
    if (category) {
      // Chỉ gửi attributeMode khi thật sự đổi — gửi lại giá trị cũ vô ích và dễ vướng khoá.
      const modeChanged = !modeLocked && input.attributeMode !== modeOf(category);
      update.mutate(
        {
          id: category.id,
          body: { ...common, description: input.description || null, ...(modeChanged ? { attributeMode: input.attributeMode } : {}) },
        },
        done,
      );
    } else {
      create.mutate({ ...common, description: input.description || undefined, attributeMode: input.attributeMode }, done);
    }
  };

  return (
    <>
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
          <Field>
            <FieldLabel htmlFor="cat-mode">Chế độ thuộc tính</FieldLabel>
            {modeLocked ? (
              <p className="rounded-lg border bg-muted/40 px-2.5 py-1.5 text-sm">
                {statusMeta(ATTRIBUTE_MODE, category.attributeMode).label}
              </p>
            ) : (
              <NativeSelect id="cat-mode" {...form.register("attributeMode")}>
                <option value="dynamic">Thuộc tính động (đa ngành hàng)</option>
                <option value="legacy_fashion">Thời trang cũ (giới tính / màu / size)</option>
              </NativeSelect>
            )}
            <p className="text-xs text-muted-foreground">
              {modeLocked
                ? `Ngành đã có ${formatNumber(category.productCount)} sản phẩm nên không đổi được chế độ thuộc tính (tránh lệch thuộc tính của sản phẩm hiện có). Muốn đổi, chuyển hết sản phẩm sang ngành khác trước.`
                : MODE_HINT[mode]}
            </p>
            {hasChildren ? (
              <p className="text-xs text-muted-foreground">
                Ngành cha không có Mẫu thuộc tính riêng — mẫu được gán ở từng ngành con (ngành lá).
              </p>
            ) : null}
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
                <Switch checked={isActive} onCheckedChange={(v) => form.setValue("isActive", v)} />
                {isActive ? "Đang hiện" : "Đang ẩn"}
              </label>
            </Field>
          </div>
        </FieldGroup>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" form="category-form" disabled={pending}>
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {category ? "Lưu" : "Tạo"}
        </Button>
      </DialogFooter>
    </>
  );
}
