"use client";

import { useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDownIcon, ChevronUpIcon, Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { NativeSelect } from "@/components/shared/native-select";
import { StatusBadge } from "@/components/shared/status-badge";
import { apiErrorCode, apiErrorMessage } from "@/lib/api-error";
import { PERMISSIONS } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { DYNAMIC_INPUT_TYPE, statusMeta } from "@/lib/labels";
import { usePermission } from "@/hooks/use-permission";
import { useCategoryTemplate, useSetCategoryTemplate } from "@/features/catalog/hooks/use-category-template";
import { useDynamicAttributes } from "@/features/catalog/hooks/use-dynamic-attributes";
import {
  MAX_TEMPLATE_ATTRIBUTES,
  MAX_VARIANT_AXIS,
  categoryTemplateSchema,
  type CategoryTemplateInput,
  type CategoryTemplateRow,
} from "@/features/catalog/schemas/category-template-schema";
import type { CategoryAdminResponse, CategoryAttributeTemplate } from "@/lib/api/generated/model";

const LOAD_ERROR = "Không tải được mẫu thuộc tính của ngành.";

/* Phần của thuộc tính (từ mẫu hoặc từ kho) đủ để dựng một dòng form. */
interface AttributeLike {
  id: string;
  code: string;
  name: string;
  inputType: CategoryTemplateRow["inputType"];
  values: readonly unknown[];
}

function rowOf(attr: AttributeLike, flags: { required: boolean; isVariantAxis: boolean }): CategoryTemplateRow {
  return {
    attributeId: attr.id,
    required: flags.required,
    isVariantAxis: flags.isVariantAxis,
    inputType: attr.inputType,
    name: attr.name,
    code: attr.code,
    valueCount: attr.values.length,
  };
}

/* Mẫu từ backend → dòng form, theo sortOrder (thứ tự hiện trên form đăng bán). */
function initialRows(template: CategoryAttributeTemplate): CategoryTemplateRow[] {
  return [...template.attributes]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((t) => rowOf(t.attribute, { required: t.required, isVariantAxis: t.isVariantAxis }));
}

/*
 * Trình soạn "Mẫu thuộc tính" của MỘT ngành `dynamic`: danh sách thuộc tính người bán phải/được nhập khi
 * đăng sản phẩm, đánh dấu bắt buộc, chọn tối đa 2 trục biến thể, sắp thứ tự. Lưu một lần bằng PUT
 * (replace-all). Màn cha chỉ mount khi có ngành được chọn.
 *
 * Quyền: xem mẫu cần catalog.category.read (đã vào được màn Ngành hàng); sửa cần catalog.category.manage;
 * danh sách thuộc tính để THÊM lấy từ catalog.dynamic_attribute.read — thiếu thì chỉ sửa được các dòng hiện có.
 */
export function CategoryTemplateDialog({ category, onClose }: { category: CategoryAdminResponse; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mẫu thuộc tính — {category.name}</DialogTitle>
          <DialogDescription>
            Thuộc tính người bán nhập khi đăng sản phẩm vào ngành này, theo đúng thứ tự dưới đây. Ngành đang có{" "}
            {formatNumber(category.productCount)} sản phẩm.
          </DialogDescription>
        </DialogHeader>
        <TemplateBody category={category} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function TemplateBody({ category, onClose }: { category: CategoryAdminResponse; onClose: () => void }) {
  const canListAttributes = usePermission(PERMISSIONS.dynamicAttributeRead);
  const template = useCategoryTemplate(category.id);
  const catalog = useDynamicAttributes(canListAttributes);

  if (template.error) return <ApiErrorState error={template.error} fallback={LOAD_ERROR} compact />;
  if (catalog.error) return <ApiErrorState error={catalog.error} fallback="Không tải được kho thuộc tính." compact />;
  if (!template.data || (canListAttributes && !catalog.data)) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  return (
    <TemplateForm
      category={category}
      rows={initialRows(template.data)}
      catalog={catalog.data ?? []}
      canListAttributes={canListAttributes}
      onClose={onClose}
    />
  );
}

function TemplateForm({
  category,
  rows: defaultRows,
  catalog,
  canListAttributes,
  onClose,
}: {
  category: CategoryAdminResponse;
  rows: CategoryTemplateRow[];
  catalog: AttributeLike[];
  canListAttributes: boolean;
  onClose: () => void;
}) {
  const canManage = usePermission(PERMISSIONS.categoryManage);
  const save = useSetCategoryTemplate(category.id);
  const [pickId, setPickId] = useState("");

  const form = useForm<CategoryTemplateInput>({
    resolver: zodResolver(categoryTemplateSchema),
    defaultValues: { rows: defaultRows },
  });
  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: "rows" });
  // `fields` chỉ phản ánh giá trị lúc thêm/xoá/đổi chỗ; công tắc sửa trực tiếp nên đọc giá trị sống ở đây.
  const rows = useWatch({ control: form.control, name: "rows" });

  const axisCount = rows.filter((r) => r.isVariantAxis).length;
  const available = useMemo(() => {
    const used = new Set(rows.map((r) => r.attributeId));
    return catalog.filter((a) => !used.has(a.id));
  }, [catalog, rows]);

  // Kiểm sống bằng chính schema + luật cần số sản phẩm (backend 409 khi xoá sạch mẫu của ngành đã có sản phẩm).
  const parsed = categoryTemplateSchema.safeParse({ rows });
  const issues = parsed.success ? [] : parsed.error.issues.map((i) => i.message);
  if (rows.length === 0 && category.productCount > 0) {
    issues.push(`Ngành đã có ${formatNumber(category.productCount)} sản phẩm — không thể xoá sạch mẫu thuộc tính.`);
  }

  const setFlag = (index: number, key: "required" | "isVariantAxis", value: boolean) =>
    form.setValue(`rows.${index}.${key}`, value, { shouldDirty: true });

  const addPicked = () => {
    const attr = catalog.find((a) => a.id === pickId);
    if (!attr) return;
    append(rowOf(attr, { required: false, isVariantAxis: false }));
    setPickId("");
  };

  const submit = (input: CategoryTemplateInput) => save.mutate(input.rows, { onSuccess: onClose });

  return (
    <form noValidate onSubmit={form.handleSubmit(submit)} className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-2">
          {fields.map((field, index) => {
            const row = rows[index];
            if (!row) return null;
            const meta = statusMeta(DYNAMIC_INPUT_TYPE, row.inputType);
            const isSelect = row.inputType === "select";
            const axisBlocked = !row.isVariantAxis && axisCount >= MAX_VARIANT_AXIS;
            return (
              <li key={field.id} className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {canManage ? (
                    <div className="flex shrink-0 flex-col">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        title="Lên"
                        aria-label="Chuyển lên"
                        disabled={index === 0}
                        onClick={() => move(index, index - 1)}
                      >
                        <ChevronUpIcon />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        title="Xuống"
                        aria-label="Chuyển xuống"
                        disabled={index === fields.length - 1}
                        onClick={() => move(index, index + 1)}
                      >
                        <ChevronDownIcon />
                      </Button>
                    </div>
                  ) : null}
                  <span className="w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <code className="font-mono">{row.code}</code>
                      <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                      {isSelect ? <span>{formatNumber(row.valueCount)} giá trị</span> : null}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 pl-7 sm:pl-0">
                  <label className="flex items-center gap-1.5 text-xs">
                    <Switch
                      size="sm"
                      checked={row.required}
                      disabled={!canManage}
                      onCheckedChange={(v) => setFlag(index, "required", v)}
                    />
                    Bắt buộc
                  </label>
                  <label
                    className="flex items-center gap-1.5 text-xs"
                    title={
                      !isSelect
                        ? "Chỉ thuộc tính kiểu Lựa chọn mới làm được trục biến thể"
                        : axisBlocked
                          ? `Đã đủ ${MAX_VARIANT_AXIS} trục biến thể — tắt một trục khác trước`
                          : "Mỗi biến thể của sản phẩm chọn đúng một giá trị trên trục này"
                    }
                  >
                    <Switch
                      size="sm"
                      checked={row.isVariantAxis}
                      disabled={!canManage || !isSelect || axisBlocked}
                      onCheckedChange={(v) => setFlag(index, "isVariantAxis", v)}
                    />
                    Trục biến thể
                  </label>
                  {canManage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-auto size-8 text-destructive sm:ml-0"
                      title="Gỡ khỏi mẫu"
                      aria-label={`Gỡ ${row.name} khỏi mẫu`}
                      onClick={() => remove(index)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
        {fields.length === 0 ? (
          <p className="rounded-xl border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
            Ngành chưa có thuộc tính nào trong mẫu.
            {canManage ? " Thêm từ danh sách bên dưới." : ""}
          </p>
        ) : null}
      </div>

      {canManage ? (
        canListAttributes ? (
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
            <NativeSelect
              aria-label="Chọn thuộc tính để thêm"
              value={pickId}
              onChange={(e) => setPickId(e.target.value)}
              disabled={rows.length >= MAX_TEMPLATE_ATTRIBUTES || available.length === 0}
            >
              <option value="">
                {available.length === 0 ? "— Đã thêm hết thuộc tính trong kho —" : "— Chọn thuộc tính để thêm vào mẫu —"}
              </option>
              {available.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.code}) · {statusMeta(DYNAMIC_INPUT_TYPE, a.inputType).label}
                </option>
              ))}
            </NativeSelect>
            <Button type="button" variant="outline" className="shrink-0" disabled={!pickId} onClick={addPicked}>
              <PlusIcon className="size-4" />
              Thêm
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Tài khoản chưa có quyền xem kho thuộc tính (catalog.dynamic_attribute.read) nên chỉ chỉnh được các dòng hiện có.
          </p>
        )
      ) : (
        <p className="text-xs text-muted-foreground">Bạn chỉ có quyền xem mẫu — cần catalog.category.manage để chỉnh sửa.</p>
      )}

      <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        Tối đa {MAX_VARIANT_AXIS} trục biến thể (vd Màu sắc × Dung lượng), trục phải là thuộc tính Lựa chọn, và mẫu có
        thuộc tính thì cần ≥ 1 trục. Hiện {axisCount}/{MAX_VARIANT_AXIS} trục.
      </p>

      {canManage && issues.length > 0 ? (
        <ul role="alert" className="list-disc rounded-xl border border-amber-300/60 bg-amber-50 py-2 pr-3 pl-7 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200">
          {issues.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      ) : null}

      {/* Lỗi 4xx của backend hiện NGUYÊN VĂN (không toast) để người dùng đọc và sửa mẫu. */}
      {save.error ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {apiErrorMessage(save.error, "Lưu mẫu thuộc tính thất bại.")}
          {apiErrorCode(save.error) ? (
            <span className="mt-0.5 block font-mono text-[11px] opacity-70">{apiErrorCode(save.error)}</span>
          ) : null}
        </div>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {canManage ? "Hủy" : "Đóng"}
        </Button>
        {canManage ? (
          <Button type="submit" disabled={save.isPending || !form.formState.isDirty || issues.length > 0}>
            {save.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Lưu mẫu
          </Button>
        ) : null}
      </DialogFooter>
    </form>
  );
}
