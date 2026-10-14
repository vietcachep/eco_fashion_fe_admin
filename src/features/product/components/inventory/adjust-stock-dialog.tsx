"use client";

import { useForm, useWatch } from "react-hook-form";
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
import {
  adjustStockSchema,
  INVENTORY_LIMITS,
  type AdjustStockInput,
} from "@/features/product/schemas/inventory-schema";
import { variantLabel, type InventoryScope } from "@/features/product/types/inventory";
import type { StockRowResponse } from "@/lib/api/generated/model";

/*
 * Điều chỉnh tồn một biến thể: delta (+/−) + lý do bắt buộc (ghi vào sổ kho).
 * Body tách riêng + `key=variantId` để mở biến thể khác thì form sạch lại mà không
 * cần setState/reset trong effect.
 */
export function AdjustStockDialog({
  scope,
  row,
  onClose,
}: {
  scope: InventoryScope;
  row: StockRowResponse | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        {row ? <AdjustStockBody key={row.variantId} scope={scope} row={row} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function AdjustStockBody({
  scope,
  row,
  onClose,
}: {
  scope: InventoryScope;
  row: StockRowResponse;
  onClose: () => void;
}) {
  const adjust = useAdjustStock(scope);
  const form = useForm<AdjustStockInput>({
    resolver: zodResolver(adjustStockSchema),
    defaultValues: { delta: 0, reason: "" },
  });
  const errors = form.formState.errors;

  const delta = useWatch({ control: form.control, name: "delta" });
  const after = row.stock + (Number.isFinite(delta) ? delta : 0);
  // Backend từ chối giảm dưới số đang giữ cho đơn (ADJUST_INVALID) và vượt trần tồn (PRODUCT_STOCK_LIMIT_EXCEEDED).
  const belowReserved = after < row.reserved;
  const overLimit = after > INVENTORY_LIMITS.maxStock;
  const label = variantLabel(row);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Điều chỉnh tồn kho</DialogTitle>
        <DialogDescription>
          {row.productName}
          {label ? ` · ${label}` : ""} · tồn hiện tại {formatNumber(row.stock)}
          {row.reserved > 0 ? ` (đang giữ cho đơn ${formatNumber(row.reserved)})` : ""}
        </DialogDescription>
      </DialogHeader>
      <form
        id="adjust-form"
        noValidate
        onSubmit={form.handleSubmit((input) =>
          adjust.mutate({ variantId: row.variantId, delta: input.delta, reason: input.reason }, { onSuccess: onClose }),
        )}
      >
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="adj-delta">Số lượng (+ cộng / − trừ)</FieldLabel>
            <Input
              id="adj-delta"
              type="number"
              inputMode="numeric"
              step={1}
              aria-invalid={!!errors.delta}
              {...form.register("delta", { valueAsNumber: true })}
            />
            <FormMessage message={errors.delta?.message} />
            <p className="text-xs text-muted-foreground">
              Tồn sau điều chỉnh:{" "}
              <b className={belowReserved || overLimit ? "text-destructive" : ""}>{formatNumber(after)}</b>
            </p>
            {belowReserved ? (
              <p className="text-xs text-destructive">
                Không thể giảm dưới số đang giữ cho đơn ({formatNumber(row.reserved)}).
              </p>
            ) : null}
            {overLimit ? (
              <p className="text-xs text-destructive">
                Tồn tối đa {formatNumber(INVENTORY_LIMITS.maxStock)} mỗi biến thể.
              </p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="adj-reason">Lý do</FieldLabel>
            <Input
              id="adj-reason"
              placeholder="Kiểm kê cuối tháng / hàng hỏng / thất lạc…"
              maxLength={INVENTORY_LIMITS.reasonMax}
              aria-invalid={!!errors.reason}
              {...form.register("reason")}
            />
            <FormMessage message={errors.reason?.message} />
          </Field>
        </FieldGroup>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" form="adjust-form" disabled={adjust.isPending || belowReserved || overLimit}>
          {adjust.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Điều chỉnh
        </Button>
      </DialogFooter>
    </>
  );
}
