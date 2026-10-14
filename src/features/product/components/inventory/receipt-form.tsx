"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/shared/form-message";
import { formatNumber, formatVnd } from "@/lib/format";
import { useCreateReceipt } from "@/features/product/hooks/use-inventory";
import {
  INVENTORY_LIMITS,
  receiptSchema,
  receiptTotal,
  type ReceiptInput,
} from "@/features/product/schemas/inventory-schema";
import { VariantPickerDialog } from "@/features/product/components/inventory/variant-picker-dialog";
import { INVENTORY_SCOPES, variantFullName, type InventoryScope } from "@/features/product/types/inventory";

/* Cột lưới của dòng phiếu ở màn rộng; màn hẹp xếp dọc theo thẻ (dùng được ở 390px). */
const LINE_GRID = "md:grid-cols-[minmax(0,1fr)_8rem_11rem_9rem_2rem]";

/*
 * Lập phiếu nhập kho (nháp). Dòng = biến thể + số lượng + giá vốn. Tạo xong
 * chuyển sang chi tiết để kiểm rồi bấm "Ghi sổ" (cộng tồn). Tổng vốn tính tại
 * chỗ để đối chiếu; backend tính lại khi lưu. `scope="vendor"`: phiếu chỉ chứa
 * biến thể của shop mình (backend kiểm, lỗi 404/4xx hiện qua toast).
 */
export function ReceiptForm({ scope }: { scope: InventoryScope }) {
  const cfg = INVENTORY_SCOPES[scope];
  const router = useRouter();
  const create = useCreateReceipt(scope);
  const [pickerOpen, setPickerOpen] = useState(false);

  const form = useForm<ReceiptInput>({
    resolver: zodResolver(receiptSchema),
    defaultValues: { supplierName: "", note: "", items: [] },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const errors = form.formState.errors;
  const items = useWatch({ control: form.control, name: "items" });
  const total = receiptTotal(items);
  const overTotal = total > INVENTORY_LIMITS.maxReceiptTotal;
  const full = fields.length >= INVENTORY_LIMITS.maxLines;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((input) =>
        create.mutate(
          {
            supplierName: input.supplierName || undefined,
            note: input.note || undefined,
            // unitCost gửi dạng chuỗi chữ số (1–12 ký tự) theo hợp đồng backend.
            items: input.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity, unitCost: String(i.unitCost) })),
          },
          { onSuccess: (r) => router.push(`${cfg.routes.receipts}/${r.id}`) },
        ),
      )}
      className="flex flex-col gap-4"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin phiếu</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="rc-supplier">Nhà cung cấp</FieldLabel>
              <Input id="rc-supplier" maxLength={200} aria-invalid={!!errors.supplierName} {...form.register("supplierName")} />
              <FormMessage message={errors.supplierName?.message} />
            </Field>
            <Field>
              <FieldLabel htmlFor="rc-note">Ghi chú</FieldLabel>
              <Input id="rc-note" maxLength={500} aria-invalid={!!errors.note} {...form.register("note")} />
              <FormMessage message={errors.note?.message} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Hàng nhập ({fields.length} dòng)</CardTitle>
          <Button type="button" variant="outline" size="sm" disabled={full} onClick={() => setPickerOpen(true)}>
            <PlusIcon className="size-4" />
            Thêm biến thể
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className={`hidden gap-3 border-y bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground md:grid ${LINE_GRID}`}>
            <span>{cfg.variantHeader}</span>
            <span>Số lượng</span>
            <span>Giá vốn / đơn vị (VND)</span>
            <span className="text-right">Thành tiền</span>
            <span />
          </div>
          {fields.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Chưa có dòng nào — bấm &quot;Thêm biến thể&quot;.
            </p>
          ) : null}
          {fields.map((f, i) => {
            const lineErrors = errors.items?.[i];
            return (
              <div key={f.id} className={`grid grid-cols-2 gap-x-3 gap-y-2 border-b px-4 py-3 md:items-start ${LINE_GRID}`}>
                <div className="col-span-2 flex items-start justify-between gap-2 text-sm md:col-span-1 md:pt-1.5">
                  <span className="min-w-0 break-words">{f.label}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-destructive md:hidden"
                    aria-label="Xoá dòng"
                    onClick={() => remove(i)}
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </div>
                <div>
                  <span className="mb-1 block text-xs text-muted-foreground md:hidden">Số lượng</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={INVENTORY_LIMITS.maxQuantity}
                    step={1}
                    className="h-8"
                    aria-label="Số lượng"
                    aria-invalid={!!lineErrors?.quantity}
                    {...form.register(`items.${i}.quantity`, { valueAsNumber: true })}
                  />
                  <FormMessage message={lineErrors?.quantity?.message} />
                </div>
                <div>
                  <span className="mb-1 block text-xs text-muted-foreground md:hidden">Giá vốn / đơn vị (VND)</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={INVENTORY_LIMITS.maxUnitCost}
                    step={1}
                    className="h-8"
                    aria-label="Giá vốn mỗi đơn vị (VND)"
                    aria-invalid={!!lineErrors?.unitCost}
                    {...form.register(`items.${i}.unitCost`, { valueAsNumber: true })}
                  />
                  <FormMessage message={lineErrors?.unitCost?.message} />
                </div>
                <div className="col-span-2 flex items-center justify-between text-sm md:col-span-1 md:justify-end md:pt-1.5">
                  <span className="text-xs text-muted-foreground md:hidden">Thành tiền</span>
                  {formatVnd((items[i]?.quantity || 0) * (items[i]?.unitCost || 0))}
                </div>
                <div className="hidden md:block">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive"
                    aria-label="Xoá dòng"
                    onClick={() => remove(i)}
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
          {errors.items?.root || errors.items?.message ? (
            <div className="px-4 py-2">
              <FormMessage message={errors.items.root?.message ?? errors.items.message} />
            </div>
          ) : null}
          {full ? (
            <p className="px-4 py-2 text-xs text-muted-foreground">
              Đã đủ {formatNumber(INVENTORY_LIMITS.maxLines)} dòng — tách phần còn lại sang phiếu khác.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-end gap-x-2 px-4 py-3 text-sm">
            Tổng vốn: <b className={overTotal ? "text-destructive" : undefined}>{formatVnd(total)}</b>
            {overTotal ? (
              <span className="basis-full text-right text-xs text-destructive">
                Vượt giới hạn {formatVnd(INVENTORY_LIMITS.maxReceiptTotal)} mỗi phiếu — tách thành nhiều phiếu.
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Hủy
        </Button>
        <Button type="submit" disabled={create.isPending || overTotal}>
          {create.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Tạo phiếu nháp
        </Button>
      </div>

      <VariantPickerDialog
        scope={scope}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        excludeIds={new Set(items.map((i) => i.variantId))}
        onPick={(r) => {
          append({ variantId: r.variantId, label: variantFullName(r), quantity: 10, unitCost: 0 });
          setPickerOpen(false);
        }}
      />
    </form>
  );
}
