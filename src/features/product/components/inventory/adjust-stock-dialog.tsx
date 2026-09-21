"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/shared/form-message";
import { formatNumber } from "@/lib/format";
import { useAdjustStock } from "@/features/product/hooks/use-inventory";
import { adjustStockSchema, type AdjustStockInput } from "@/features/product/schemas/inventory-schema";
import type { StockRowResponse } from "@/lib/api/generated/model";

/* Điều chỉnh tồn một biến thể: delta (+/−) + lý do bắt buộc (ghi vào sổ kho). */
export function AdjustStockDialog({ row, onClose }: { row: StockRowResponse | null; onClose: () => void }) {
  const adjust = useAdjustStock();
  const form = useForm<AdjustStockInput>({
    resolver: zodResolver(adjustStockSchema),
    defaultValues: { delta: 0, reason: "" },
  });
  const errors = form.formState.errors;

  useEffect(() => {
    if (row) form.reset({ delta: 0, reason: "" });
  }, [row, form]);

  const delta = form.watch("delta");
  const after = row ? row.stock + (Number.isFinite(delta) ? delta : 0) : 0;

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Điều chỉnh tồn kho</DialogTitle>
          <DialogDescription>
            {row?.productName} · {row?.color} · {row?.size} · tồn hiện tại {formatNumber(row?.stock)}
          </DialogDescription>
        </DialogHeader>
        <form
          id="adjust-form"
          noValidate
          onSubmit={form.handleSubmit((input) =>
            row && adjust.mutate({ variantId: row.variantId, delta: input.delta, reason: input.reason }, { onSuccess: onClose }),
          )}
        >
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="adj-delta">Số lượng (+ cộng / − trừ)</FieldLabel>
              <Input id="adj-delta" type="number" step={1} aria-invalid={!!errors.delta} {...form.register("delta", { valueAsNumber: true })} />
              <FormMessage message={errors.delta?.message} />
              <p className="text-xs text-muted-foreground">
                Tồn sau điều chỉnh: <b className={after < 0 ? "text-destructive" : ""}>{formatNumber(after)}</b>
              </p>
            </Field>
            <Field>
              <FieldLabel htmlFor="adj-reason">Lý do</FieldLabel>
              <Input id="adj-reason" placeholder="Kiểm kê cuối tháng / hàng hỏng / thất lạc…" aria-invalid={!!errors.reason} {...form.register("reason")} />
              <FormMessage message={errors.reason?.message} />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" form="adjust-form" disabled={adjust.isPending || after < 0}>
            {adjust.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Điều chỉnh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
