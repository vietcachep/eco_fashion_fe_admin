"use client";

import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/shared/form-message";
import { NativeSelect } from "@/components/shared/native-select";
import type { ProductAttributeValueResponse } from "@/lib/api/generated/model";
import type { ProductTemplate } from "@/features/product/types/product";

/*
 * Thuộc tính CẤP SẢN PHẨM của ngành dynamic, sinh từ mẫu ngành: select → ô chọn
 * theo `values`, text → ô chữ, number → ô số. TRỤ BIẾN THỂ không nằm ở đây mà ở
 * ma trận biến thể. Thuộc tính `required` chỉ chặn lúc ĐĂNG BÁN (backend), nên
 * form vẫn cho lưu thiếu — chỉ đánh dấu để người nhập biết cần bổ sung.
 * Thuần trình bày: giá trị + lỗi nằm ở form cha (RHF).
 *
 * `saved` = thuộc tính đã lưu của sản phẩm (backend đã resolve tên giá trị). Giá
 * trị select đã lưu mà admin sau đó ẩn khỏi danh mục sẽ không còn trong `values`
 * của mẫu — vẫn hiện nó (kèm nhãn) để ô chọn không báo trống sai sự thật.
 */
export function ProductAttributeFields({
  template,
  values,
  errors,
  saved,
  onChange,
}: {
  template: ProductTemplate;
  /** attributeId → attributeValueId (select) hoặc chữ đã nhập. */
  values: Record<string, string>;
  errors: Record<string, string | undefined>;
  saved?: ProductAttributeValueResponse[];
  onChange: (attributeId: string, value: string) => void;
}) {
  if (template.fields.length === 0) {
    return <p className="text-sm text-muted-foreground">Ngành này không có thuộc tính cấp sản phẩm.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {template.fields.map((f) => {
        const id = `p-attr-${f.attributeId}`;
        const error = errors[f.attributeId];
        const current = values[f.attributeId] ?? "";
        const orphan =
          f.inputType === "select" && current && !f.values.some((v) => v.id === current)
            ? saved?.find((a) => a.attributeId === f.attributeId && a.attributeValueId === current)
            : undefined;
        return (
          <Field key={f.attributeId}>
            <FieldLabel htmlFor={id}>
              {f.name}
              {f.required ? <span className="text-xs font-normal text-muted-foreground"> · bắt buộc khi đăng bán</span> : null}
            </FieldLabel>
            {f.inputType === "select" ? (
              <NativeSelect
                id={id}
                aria-invalid={!!error}
                value={current}
                onChange={(e) => onChange(f.attributeId, e.target.value)}
              >
                <option value="">— Chọn —</option>
                {orphan ? <option value={current}>{orphan.value ?? "Giá trị cũ"} (đã ngừng dùng)</option> : null}
                {f.values.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.value}
                  </option>
                ))}
              </NativeSelect>
            ) : (
              <Input
                id={id}
                inputMode={f.inputType === "number" ? "decimal" : undefined}
                maxLength={255}
                aria-invalid={!!error}
                value={current}
                onChange={(e) => onChange(f.attributeId, e.target.value)}
              />
            )}
            <FormMessage message={error} />
          </Field>
        );
      })}
    </div>
  );
}
