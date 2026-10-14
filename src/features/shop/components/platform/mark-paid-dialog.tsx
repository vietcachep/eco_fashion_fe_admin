"use client";

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
import { formatVnd } from "@/lib/format";
import type { ShopPayoutResponse } from "@/lib/api/generated/model";
import { useMarkPayoutPaid } from "@/features/shop/hooks/use-admin-payouts";
import { payoutMarkPaidSchema, type PayoutMarkPaidInput } from "@/features/shop/schemas/payout-mark-paid-schema";

/*
 * Kế toán xác nhận đã chuyển khoản tay (hoặc đối chiếu kỳ "Đang chi" trên PayOS).
 * Mã chứng từ bắt buộc để sau này tra được khoản chi; ghi chú tuỳ chọn.
 */
export function MarkPaidDialog({ payout, onClose }: { payout: ShopPayoutResponse; onClose: () => void }) {
  const markPaid = useMarkPayoutPaid();
  const form = useForm<PayoutMarkPaidInput>({
    resolver: zodResolver(payoutMarkPaidSchema),
    defaultValues: { providerRef: payout.providerRef ?? "", note: "" },
  });
  const errors = form.formState.errors;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Đánh dấu đã chi — {payout.code}</DialogTitle>
          <DialogDescription>
            Xác nhận đã chuyển {formatVnd(payout.netPayout)} cho shop
            {payout.bankAccountMasked ? ` (TK ${payout.bankAccountMasked})` : ""}. Thao tác không hoàn tác được.
          </DialogDescription>
        </DialogHeader>
        <form
          id="mark-paid-form"
          noValidate
          onSubmit={form.handleSubmit((input) =>
            markPaid.mutate({ id: payout.id, providerRef: input.providerRef, note: input.note }, { onSuccess: onClose }),
          )}
        >
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="mark-paid-ref">Mã giao dịch / chứng từ</FieldLabel>
              <Input id="mark-paid-ref" placeholder="FT26093012345" aria-invalid={!!errors.providerRef} {...form.register("providerRef")} />
              <FormMessage message={errors.providerRef?.message} />
            </Field>
            <Field>
              <FieldLabel htmlFor="mark-paid-note">Ghi chú (tuỳ chọn)</FieldLabel>
              <Input id="mark-paid-note" placeholder="Chuyển tay qua Vietcombank…" aria-invalid={!!errors.note} {...form.register("note")} />
              <FormMessage message={errors.note?.message} />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" form="mark-paid-form" disabled={markPaid.isPending}>
            {markPaid.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Đánh dấu đã chi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
