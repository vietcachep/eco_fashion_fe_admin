"use client";

import { useEffect, useState } from "react";
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
import { ApiErrorState } from "@/components/shared/api-error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormMessage } from "@/components/shared/form-message";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PERMISSIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  useAttributes,
  useDeleteAttributeValue,
  useSaveAttributeValue,
} from "@/features/catalog/hooks/use-attributes";
import {
  attributeValueSchema,
  type AttributeValueInput,
} from "@/features/catalog/schemas/attribute-value-schema";
import type { AttributeResponse, AttributeValueResponse } from "@/lib/api/generated/model";

const LOAD_ERROR = "Không tải được bộ thuộc tính.";

/*
 * Thuộc tính sản phẩm: mỗi bộ (màu / size / chất liệu) một thẻ, liệt kê giá
 * trị dạng chip; bộ màu hiện ô màu hex. Thêm/sửa qua popup, xoá hỏi xác nhận.
 */
export function AttributesScreen() {
  const { data, isPending, error } = useAttributes();

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;
  if (isPending) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {(data ?? []).map((attr) => (
        <AttributeCard key={attr.code} attr={attr} />
      ))}
    </div>
  );
}

function AttributeCard({ attr }: { attr: AttributeResponse }) {
  const remove = useDeleteAttributeValue(attr.code);
  const [form, setForm] = useState<{ open: boolean; edit?: AttributeValueResponse }>({ open: false });
  const [toDelete, setToDelete] = useState<AttributeValueResponse | null>(null);
  const isColor = attr.kind === "color";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          {attr.name}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {attr.values.length} giá trị · {attr.isFilterable ? "lọc được" : "không lọc"}
          </span>
        </CardTitle>
        <PermissionGate permission={PERMISSIONS.attributeManage}>
          <Button size="sm" variant="outline" onClick={() => setForm({ open: true })}>
            <PlusIcon className="size-3.5" />
            Thêm
          </Button>
        </PermissionGate>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {attr.values.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có giá trị.</p> : null}
        {attr.values.map((v) => (
          <div
            key={v.code}
            className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60", !v.isActive && "opacity-50")}
          >
            {isColor ? (
              <span className="size-4 shrink-0 rounded-full border" style={{ background: v.hex ?? "#fff" }} />
            ) : null}
            <span className="min-w-0 flex-1 truncate">
              {v.name}
              <code className="ml-1.5 font-mono text-[11px] text-muted-foreground">{v.code}</code>
              {v.groupCode ? <span className="ml-1.5 text-xs text-muted-foreground">({v.groupCode})</span> : null}
            </span>
            <PermissionGate permission={PERMISSIONS.attributeManage}>
              <Button variant="ghost" size="icon" className="size-7" title="Sửa" onClick={() => setForm({ open: true, edit: v })}>
                <PencilIcon className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-7 text-destructive" title="Xoá" onClick={() => setToDelete(v)}>
                <Trash2Icon className="size-3.5" />
              </Button>
            </PermissionGate>
          </div>
        ))}
      </CardContent>

      <ValueFormDialog
        open={form.open}
        onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))}
        attr={attr}
        value={form.edit}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Xoá giá trị "${toDelete?.name}"?`}
        description="Không xoá được nếu đang có biến thể sản phẩm dùng giá trị này — hãy ẩn thay vì xoá."
        confirmLabel="Xoá"
        destructive
        onConfirm={() => toDelete && remove.mutate(toDelete.code)}
      />
    </Card>
  );
}

function ValueFormDialog({
  open,
  onOpenChange,
  attr,
  value,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attr: AttributeResponse;
  value?: AttributeValueResponse;
}) {
  const save = useSaveAttributeValue(attr.code);
  const form = useForm<AttributeValueInput>({
    resolver: zodResolver(attributeValueSchema),
    defaultValues: { code: "", name: "", hex: "", groupCode: "", sortOrder: 0, isActive: true },
  });
  const errors = form.formState.errors;
  const isColor = attr.kind === "color";

  useEffect(() => {
    if (!open) return;
    form.reset(
      value
        ? { code: value.code, name: value.name, hex: value.hex ?? "", groupCode: value.groupCode ?? "", sortOrder: value.sortOrder, isActive: value.isActive }
        : { code: "", name: "", hex: "", groupCode: "", sortOrder: (attr.values.length + 1) * 10, isActive: true },
    );
  }, [open, value, attr.values.length, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {value ? "Sửa" : "Thêm"} giá trị — {attr.name}
          </DialogTitle>
        </DialogHeader>
        <form
          id="attr-value-form"
          noValidate
          onSubmit={form.handleSubmit((input) =>
            save.mutate(
              {
                code: input.code,
                name: input.name,
                hex: isColor && input.hex ? input.hex : null,
                groupCode: input.groupCode || null,
                sortOrder: input.sortOrder,
                isActive: input.isActive,
              },
              { onSuccess: () => onOpenChange(false) },
            ),
          )}
        >
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="av-code">Mã</FieldLabel>
                <Input id="av-code" placeholder={isColor ? "den" : "M"} disabled={!!value} aria-invalid={!!errors.code} {...form.register("code")} />
                <FormMessage message={errors.code?.message} />
              </Field>
              <Field>
                <FieldLabel htmlFor="av-name">Tên hiển thị</FieldLabel>
                <Input id="av-name" placeholder={isColor ? "Đen" : "M"} aria-invalid={!!errors.name} {...form.register("name")} />
                <FormMessage message={errors.name?.message} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {isColor ? (
                <Field>
                  <FieldLabel htmlFor="av-hex">Mã màu</FieldLabel>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label="Chọn màu"
                      className="size-8 cursor-pointer rounded border p-0"
                      value={/^#[0-9a-fA-F]{6}$/.test(form.watch("hex")) ? form.watch("hex") : "#000000"}
                      onChange={(e) => form.setValue("hex", e.target.value)}
                    />
                    <Input id="av-hex" placeholder="#000000" aria-invalid={!!errors.hex} {...form.register("hex")} />
                  </div>
                  <FormMessage message={errors.hex?.message} />
                </Field>
              ) : (
                <Field>
                  <FieldLabel htmlFor="av-group">Nhóm (tuỳ chọn)</FieldLabel>
                  <Input id="av-group" placeholder="ao / quan…" {...form.register("groupCode")} />
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="av-sort">Thứ tự</FieldLabel>
                <Input id="av-sort" type="number" min={0} {...form.register("sortOrder", { valueAsNumber: true })} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.watch("isActive")} onCheckedChange={(v) => form.setValue("isActive", v)} />
              {form.watch("isActive") ? "Đang dùng" : "Đã ẩn"}
            </label>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="submit" form="attr-value-form" disabled={save.isPending}>
            {save.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
