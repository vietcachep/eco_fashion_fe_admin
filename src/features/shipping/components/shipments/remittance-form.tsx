"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { FormMessage } from "@/components/shared/form-message";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { useConfirmCarrierCod } from "@/features/shipping/hooks/use-shipments";
import { remittanceSchema, type RemittanceInput } from "@/features/shipping/schemas/remittance-schema";
import type { ShipmentSummary } from "@/types/shipping";

export function RemittanceForm({ shipment }: { shipment: ShipmentSummary }) {
  const confirm = useConfirmCarrierCod(shipment.id);
  const amount = shipment.codAmount;
  const form = useForm<RemittanceInput>({ resolver: zodResolver(remittanceSchema), defaultValues: { amount, reference: "", note: "" } });
  return <form noValidate onSubmit={form.handleSubmit((values) => confirm.mutate(values))} className="space-y-3 rounded-xl border p-4">
    <h3 className="text-sm font-semibold">Xác nhận đã nhận tiền COD từ hãng</h3>
    <p className="text-xs text-muted-foreground">Chỉ xác nhận sau khi đối chiếu khoản tiền thực về tài khoản sàn. Giao thành công chưa đồng nghĩa sàn đã nhận tiền.</p>
    <Field><FieldLabel htmlFor="remit-amount">Số tiền thực nhận (VND)</FieldLabel><Input id="remit-amount" inputMode="numeric" {...form.register("amount")} /><FormMessage message={form.formState.errors.amount?.message} /></Field>
    <Field><FieldLabel htmlFor="remit-reference">Mã tham chiếu giao dịch</FieldLabel><Input id="remit-reference" {...form.register("reference")} /><FormMessage message={form.formState.errors.reference?.message} /></Field>
    <Field><FieldLabel htmlFor="remit-note">Ghi chú</FieldLabel><Input id="remit-note" {...form.register("note")} /><FormMessage message={form.formState.errors.note?.message} /></Field>
    {confirm.error ? <ApiErrorState compact error={confirm.error} fallback="Chưa ghi nhận được khoản tiền COD." /> : null}
    <Button disabled={confirm.isPending || confirm.isSuccess} type="submit">{confirm.isSuccess ? "Đã xác nhận" : confirm.isPending ? "Đang xác nhận…" : "Xác nhận tiền đã về sàn"}</Button>
  </form>;
}
