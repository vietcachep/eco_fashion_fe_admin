"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/shared/form-message";
import { NativeSelect } from "@/components/shared/native-select";
import { apiErrorCode, apiMessage } from "@/lib/api-error";
import { useCreateDynamicAttribute } from "@/features/catalog/hooks/use-dynamic-attributes";
import { dynamicAttributeSchema, type DynamicAttributeInput } from "@/features/catalog/schemas/dynamic-attribute-schema";
import type { DynamicAttributeResponse } from "@/lib/api/generated/model";

const INPUT_TYPE_HINT: Record<DynamicAttributeInput["inputType"], string> = {
  select: "Chọn từ danh sách giá trị có sẵn (Màu sắc, Dung lượng…). Chỉ kiểu này làm được trục biến thể.",
  text: "Người bán gõ tự do khi đăng sản phẩm (Hạn sử dụng, Tác giả…). Không có danh sách giá trị.",
  number: "Người bán nhập số khi đăng sản phẩm. Không có danh sách giá trị.",
};

/*
 * Tạo thuộc tính động. Backend KHÔNG có API sửa/xoá thuộc tính — mã và kiểu nhập cố định sau khi tạo
 * (chỉ thêm/sửa/xoá GIÁ TRỊ), nên form nhắc rõ để tránh tạo nhầm. Thân form tách riêng: Dialog gỡ nội
 * dung khi đóng nên mỗi lần mở là một form mới, không cần reset thủ công.
 */
export function DynamicAttributeFormDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (attribute: DynamicAttributeResponse) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <FormBody onClose={() => onOpenChange(false)} onCreated={onCreated} />
      </DialogContent>
    </Dialog>
  );
}

function FormBody({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: (attribute: DynamicAttributeResponse) => void;
}) {
  const create = useCreateDynamicAttribute();
  const form = useForm<DynamicAttributeInput>({
    resolver: zodResolver(dynamicAttributeSchema),
    defaultValues: { code: "", name: "", inputType: "select" },
  });
  const errors = form.formState.errors;
  const inputType = useWatch({ control: form.control, name: "inputType" });

  const submit = (input: DynamicAttributeInput) =>
    create.mutate(input, {
      onSuccess: (attribute) => {
        onClose();
        onCreated?.(attribute);
      },
      // Mã trùng: đánh dấu thẳng ô Mã (toast của hook vẫn hiện câu của backend).
      onError: (e) => {
        if (apiErrorCode(e) === "CATALOG_CODE_EXISTS") {
          form.setError("code", { message: apiMessage(e) ?? "Mã này đã tồn tại" });
        }
      },
    });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Thêm thuộc tính động</DialogTitle>
      </DialogHeader>
      <form id="dynamic-attribute-form" noValidate onSubmit={form.handleSubmit(submit)}>
        <FieldGroup className="gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="da-code">Mã (code)</FieldLabel>
              <Input
                id="da-code"
                placeholder="screen_size"
                autoComplete="off"
                aria-invalid={!!errors.code}
                {...form.register("code")}
              />
              <FormMessage message={errors.code?.message} />
            </Field>
            <Field>
              <FieldLabel htmlFor="da-name">Tên hiển thị</FieldLabel>
              <Input id="da-name" placeholder="Kích thước màn hình" aria-invalid={!!errors.name} {...form.register("name")} />
              <FormMessage message={errors.name?.message} />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="da-type">Kiểu nhập</FieldLabel>
            <NativeSelect id="da-type" aria-invalid={!!errors.inputType} {...form.register("inputType")}>
              <option value="select">Lựa chọn (chọn từ danh sách)</option>
              <option value="text">Văn bản (nhập tay)</option>
              <option value="number">Số (nhập tay)</option>
            </NativeSelect>
            <p className="text-xs text-muted-foreground">{INPUT_TYPE_HINT[inputType]}</p>
            <FormMessage message={errors.inputType?.message} />
          </Field>
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            Mã chữ thường, số, gạch dưới; duy nhất toàn sàn. Mã và kiểu nhập <b>không sửa được</b> sau khi tạo. Thuộc tính
            “màu” là thuộc tính Lựa chọn có giá trị gắn mã màu — không phải kiểu riêng.
          </p>
        </FieldGroup>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" form="dynamic-attribute-form" disabled={create.isPending}>
          {create.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Tạo
        </Button>
      </DialogFooter>
    </>
  );
}
