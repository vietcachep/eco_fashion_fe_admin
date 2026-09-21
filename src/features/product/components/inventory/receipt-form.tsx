"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormMessage } from "@/components/shared/form-message";
import { ROUTES } from "@/lib/constants";
import { formatVnd } from "@/lib/format";
import { useCreateReceipt } from "@/features/product/hooks/use-inventory";
import { receiptSchema, type ReceiptInput } from "@/features/product/schemas/inventory-schema";
import { VariantPickerDialog } from "@/features/product/components/inventory/variant-picker-dialog";

/*
 * Lập phiếu nhập kho (nháp). Dòng = biến thể + số lượng + giá vốn. Tạo xong
 * chuyển sang chi tiết để kiểm rồi bấm "Ghi sổ" (cộng tồn). Tổng vốn tính tại
 * chỗ để đối chiếu; backend tính lại khi lưu.
 */
export function ReceiptForm() {
  const router = useRouter();
  const create = useCreateReceipt();
  const [pickerOpen, setPickerOpen] = useState(false);

  const form = useForm<ReceiptInput>({
    resolver: zodResolver(receiptSchema),
    defaultValues: { supplierName: "", note: "", items: [] },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const errors = form.formState.errors;
  const items = form.watch("items");
  const total = items.reduce((s, i) => s + (Number.isFinite(i.quantity) ? i.quantity : 0) * (Number.isFinite(i.unitCost) ? i.unitCost : 0), 0);

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((input) =>
        create.mutate(
          {
            supplierName: input.supplierName || undefined,
            note: input.note || undefined,
            items: input.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity, unitCost: String(i.unitCost) })),
          },
          { onSuccess: (r) => router.push(`${ROUTES.product.receipts}/${r.id}`) },
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
              <Input id="rc-supplier" {...form.register("supplierName")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="rc-note">Ghi chú</FieldLabel>
              <Input id="rc-note" {...form.register("note")} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Hàng nhập ({fields.length} dòng)</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
            <PlusIcon className="size-4" />
            Thêm biến thể
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Biến thể</TableHead>
                <TableHead className="w-32">Số lượng</TableHead>
                <TableHead className="w-44">Giá vốn / đơn vị (VND)</TableHead>
                <TableHead className="w-36 text-right">Thành tiền</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                    Chưa có dòng nào — bấm &quot;Thêm biến thể&quot;.
                  </TableCell>
                </TableRow>
              ) : null}
              {fields.map((f, i) => (
                <TableRow key={f.id}>
                  <TableCell className="text-sm">{f.label}</TableCell>
                  <TableCell>
                    <Input type="number" min={1} className="h-8" aria-invalid={!!errors.items?.[i]?.quantity} {...form.register(`items.${i}.quantity`, { valueAsNumber: true })} />
                    <FormMessage message={errors.items?.[i]?.quantity?.message} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" min={0} step={1000} className="h-8" aria-invalid={!!errors.items?.[i]?.unitCost} {...form.register(`items.${i}.unitCost`, { valueAsNumber: true })} />
                    <FormMessage message={errors.items?.[i]?.unitCost?.message} />
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatVnd((items[i]?.quantity || 0) * (items[i]?.unitCost || 0))}
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => remove(i)}>
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {errors.items?.root || errors.items?.message ? (
            <div className="px-4 py-2">
              <FormMessage message={errors.items.root?.message ?? errors.items.message} />
            </div>
          ) : null}
          <div className="flex justify-end border-t px-4 py-3 text-sm">
            Tổng vốn: <b className="ml-2">{formatVnd(total)}</b>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Hủy
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Tạo phiếu nháp
        </Button>
      </div>

      <VariantPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        excludeIds={new Set(items.map((i) => i.variantId))}
        onPick={(r) => {
          append({ variantId: r.variantId, label: `${r.productName} · ${r.color} · ${r.size} (${r.sku})`, quantity: 10, unitCost: 0 });
          setPickerOpen(false);
        }}
      />
    </form>
  );
}
