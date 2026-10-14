"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, PaletteIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormMessage } from "@/components/shared/form-message";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { apiErrorCode, apiMessage } from "@/lib/api-error";
import { PERMISSIONS } from "@/lib/constants";
import { DYNAMIC_INPUT_TYPE, statusMeta } from "@/lib/labels";
import {
  isColorAttribute,
  useAddDynamicAttributeValue,
  useDeleteDynamicAttributeValue,
  useDynamicAttributes,
  useUpdateDynamicAttributeValue,
  valueHex,
} from "@/features/catalog/hooks/use-dynamic-attributes";
import {
  dynamicAttributeValueSchema,
  type DynamicAttributeValueInput,
} from "@/features/catalog/schemas/dynamic-attribute-schema";
import type { DynamicAttributeResponse, DynamicAttributeValueResponse } from "@/lib/api/generated/model";

const LOAD_ERROR = "Không tải được thuộc tính.";
/* Từ ngưỡng này mới hiện ô lọc giá trị (thương hiệu có ~130 giá trị, còn lại vài chục). */
const SEARCH_THRESHOLD = 10;

/*
 * Ngăn bên phải quản lý GIÁ TRỊ của một thuộc tính (thêm / sửa / xoá). Màn cha chỉ mount khi có thuộc
 * tính được chọn. Dữ liệu lấy từ danh sách đã cache (cùng query với bảng) nên sau mỗi lần ghi ngăn tự
 * cập nhật — không giữ bản sao riêng.
 */
export function DynamicAttributeValuesSheet({ attributeId, onClose }: { attributeId: string; onClose: () => void }) {
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetBody attributeId={attributeId} />
      </SheetContent>
    </Sheet>
  );
}

function SheetBody({ attributeId }: { attributeId: string }) {
  const { data, isPending, error } = useDynamicAttributes();
  const attribute = data?.find((a) => a.id === attributeId);

  if (error) {
    return (
      <div className="p-4">
        <ApiErrorState error={error} fallback={LOAD_ERROR} compact />
      </div>
    );
  }
  if (isPending || !attribute) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }
  return <AttributeValues attribute={attribute} />;
}

function AttributeValues({ attribute }: { attribute: DynamicAttributeResponse }) {
  const remove = useDeleteDynamicAttributeValue(attribute.id);
  const [editing, setEditing] = useState<DynamicAttributeValueResponse | null>(null);
  const [toDelete, setToDelete] = useState<DynamicAttributeValueResponse | null>(null);
  const [filter, setFilter] = useState("");
  const meta = statusMeta(DYNAMIC_INPUT_TYPE, attribute.inputType);
  const isSelect = attribute.inputType === "select";

  const sorted = useMemo(
    () => [...attribute.values].sort((a, b) => a.sortOrder - b.sortOrder || a.value.localeCompare(b.value, "vi")),
    [attribute.values],
  );
  const visible = useMemo(() => {
    const kw = filter.trim().toLowerCase();
    return kw ? sorted.filter((v) => v.value.toLowerCase().includes(kw)) : sorted;
  }, [sorted, filter]);
  const nextSortOrder = sorted.length ? Math.max(...sorted.map((v) => v.sortOrder)) + 1 : 0;

  return (
    <>
      <SheetHeader className="pr-12">
        <SheetTitle>{attribute.name}</SheetTitle>
        <SheetDescription className="flex flex-wrap items-center gap-2">
          <code className="font-mono text-xs">{attribute.code}</code>
          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
          {isSelect ? <span>{attribute.values.length} giá trị</span> : null}
        </SheetDescription>
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
        {!isSelect ? (
          <p className="rounded-xl border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
            Thuộc tính kiểu <b>{meta.label}</b>: người bán nhập tay khi đăng sản phẩm nên không có danh sách giá trị và
            không làm được trục biến thể. Chỉ thuộc tính kiểu Lựa chọn mới quản lý giá trị tại đây.
          </p>
        ) : (
          <>
            <PermissionGate permission={PERMISSIONS.dynamicAttributeManage}>
              <ValueForm
                key={editing?.id ?? "new"}
                attribute={attribute}
                editing={editing}
                nextSortOrder={nextSortOrder}
                onDone={() => setEditing(null)}
              />
            </PermissionGate>

            {attribute.values.length > SEARCH_THRESHOLD ? (
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Lọc giá trị…"
                  className="h-9 rounded-lg pl-9"
                />
              </div>
            ) : null}

            {attribute.values.length === 0 ? (
              <p className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                Chưa có giá trị nào — thuộc tính này chưa dùng được cho sản phẩm. Thêm giá trị ở khung phía trên.
              </p>
            ) : visible.length === 0 ? (
              <p className="px-1 text-sm text-muted-foreground">Không có giá trị khớp “{filter}”.</p>
            ) : (
              <ul className="divide-y rounded-xl border">
                {visible.map((v) => {
                  const hex = valueHex(v.extra);
                  return (
                    <li key={v.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                      {hex ? (
                        <span
                          className="size-4 shrink-0 rounded-full border"
                          style={{ background: hex }}
                          aria-label={`Màu ${hex}`}
                        />
                      ) : null}
                      <span className="min-w-0 flex-1 truncate">{v.value}</span>
                      {hex ? <code className="font-mono text-[11px] text-muted-foreground">{hex}</code> : null}
                      <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground" title="Thứ tự hiển thị">
                        {v.sortOrder}
                      </span>
                      <PermissionGate permission={PERMISSIONS.dynamicAttributeManage}>
                        <Button variant="ghost" size="icon" className="size-7" title="Sửa" onClick={() => setEditing(v)}>
                          <PencilIcon className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive"
                          title="Xoá"
                          onClick={() => setToDelete(v)}
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      </PermissionGate>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Xoá giá trị "${toDelete?.value}"?`}
        description="Không xoá được nếu đang có sản phẩm hoặc biến thể (kể cả biến thể đã xoá mềm) dùng giá trị này — khi đó hãy đổi tên giá trị thay vì xoá."
        confirmLabel="Xoá"
        destructive
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </>
  );
}

/*
 * Form thêm / sửa MỘT giá trị. `key` đổi theo giá trị đang sửa nên mỗi lần chuyển giữa "thêm" và "sửa"
 * là form mới. Thêm xong form được làm trống tại chỗ (thứ tự +1, focus về ô giá trị) để nhập liền
 * tay nhiều giá trị — thương hiệu/chất liệu có hàng chục giá trị.
 */
function ValueForm({
  attribute,
  editing,
  nextSortOrder,
  onDone,
}: {
  attribute: DynamicAttributeResponse;
  editing: DynamicAttributeValueResponse | null;
  nextSortOrder: number;
  onDone: () => void;
}) {
  const add = useAddDynamicAttributeValue(attribute.id);
  const update = useUpdateDynamicAttributeValue(attribute.id);
  const pending = add.isPending || update.isPending;

  // Ô màu hiện sẵn với thuộc tính màu / giá trị đang có màu; thuộc tính khác thì bật tay (hiếm khi cần).
  const [showHex, setShowHex] = useState(isColorAttribute(attribute) || (!!editing && valueHex(editing.extra) !== null));
  const form = useForm<DynamicAttributeValueInput>({
    resolver: zodResolver(dynamicAttributeValueSchema),
    defaultValues: {
      value: editing?.value ?? "",
      hex: editing ? (valueHex(editing.extra) ?? "") : "",
      sortOrder: editing?.sortOrder ?? nextSortOrder,
    },
  });
  const errors = form.formState.errors;
  const hexValue = useWatch({ control: form.control, name: "hex" });

  // Giá trị trùng trong cùng thuộc tính (409): đánh dấu ô Giá trị, toast của hook vẫn hiện.
  const onError = (e: unknown) => {
    if (apiErrorCode(e) === "CATALOG_VALUE_EXISTS") {
      form.setError("value", { message: apiMessage(e) ?? "Giá trị này đã tồn tại" });
    }
  };

  const submit = (input: DynamicAttributeValueInput) => {
    const payload = { value: input.value, sortOrder: input.sortOrder, hex: showHex ? input.hex : undefined };
    if (editing) {
      update.mutate({ valueId: editing.id, payload }, { onSuccess: onDone, onError });
    } else {
      add.mutate(payload, {
        onSuccess: () => {
          form.reset({ value: "", hex: "", sortOrder: input.sortOrder + 1 });
          form.setFocus("value");
        },
        onError,
      });
    }
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-3">
      <p className="text-sm font-medium">{editing ? `Sửa giá trị "${editing.value}"` : "Thêm giá trị mới"}</p>
      <div className="grid grid-cols-[1fr_5.5rem] gap-2">
        <Field>
          <FieldLabel htmlFor="dav-value">Giá trị</FieldLabel>
          <Input
            id="dav-value"
            autoComplete="off"
            placeholder={showHex ? "Đỏ" : "128GB"}
            aria-invalid={!!errors.value}
            {...form.register("value")}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="dav-sort">Thứ tự</FieldLabel>
          <Input id="dav-sort" type="number" min={0} aria-invalid={!!errors.sortOrder} {...form.register("sortOrder", { valueAsNumber: true })} />
        </Field>
      </div>
      <FormMessage message={errors.value?.message ?? errors.sortOrder?.message} />

      {showHex ? (
        <Field>
          <FieldLabel htmlFor="dav-hex">Mã màu (tuỳ chọn)</FieldLabel>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Chọn màu"
              className="size-8 shrink-0 cursor-pointer rounded border p-0"
              value={/^#[0-9a-fA-F]{6}$/.test(hexValue) ? hexValue : "#000000"}
              onChange={(e) => form.setValue("hex", e.target.value, { shouldDirty: true, shouldValidate: true })}
            />
            <Input id="dav-hex" placeholder="#RRGGBB" autoComplete="off" aria-invalid={!!errors.hex} {...form.register("hex")} />
          </div>
          <FormMessage message={errors.hex?.message} />
        </Field>
      ) : (
        <button
          type="button"
          onClick={() => setShowHex(true)}
          className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <PaletteIcon className="size-3.5" />
          Gắn mã màu cho giá trị này
        </button>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2Icon className="size-3.5 animate-spin" /> : editing ? null : <PlusIcon className="size-3.5" />}
          {editing ? "Lưu" : "Thêm giá trị"}
        </Button>
        {editing ? (
          <Button type="button" variant="outline" size="sm" onClick={onDone}>
            Huỷ
          </Button>
        ) : null}
      </div>
    </form>
  );
}
