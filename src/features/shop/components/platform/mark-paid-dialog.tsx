"use client";

import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FormMessage } from "@/components/shared/form-message";
import { formatVnd } from "@/lib/format";
import type { ShopPayoutResponse } from "@/lib/api/generated/model";
import { payoutActionError, useMarkPayoutPaid } from "@/features/shop/hooks/use-admin-payouts";
import { payoutMarkPaidSchema, type PayoutMarkPaidInput } from "@/features/shop/schemas/payout-mark-paid-schema";

/*
 * Kế toán xác nhận đã chuyển khoản TAY. Mã chứng từ bắt buộc để sau này tra được khoản chi; ghi chú tuỳ chọn.
 *
 * Kỳ `processing` / `unknown` là kỳ PayOS có thể ĐÃ nhận lệnh chi: đánh dấu tay ở đây có thể gây chi trùng, nên backend chỉ cho khi kế toán
 * xác nhận bằng cờ `confirmGatewayNotExecuted` — ô tick dưới đây. Mặc định phải bấm "Đối chiếu PayOS" trước; ô này là lối thoát cuối
 * khi PayOS không tra được nhưng bảng điều khiển PayOS cho thấy lệnh KHÔNG được thực hiện.
 */
export function MarkPaidDialog({ payout, onClose }: { payout: ShopPayoutResponse; onClose: () => void }) {
  const markPaid = useMarkPayoutPaid();
  const needsGatewayConfirm = payout.status === "processing" || payout.status === "unknown";
  const schema = useMemo(() => payoutMarkPaidSchema(needsGatewayConfirm), [needsGatewayConfirm]);
  const form = useForm<PayoutMarkPaidInput>({
    resolver: zodResolver(schema),
    defaultValues: { providerRef: payout.providerRef ?? "", note: "", confirmGatewayNotExecuted: false },
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
            markPaid.mutate(
              { id: payout.id, providerRef: input.providerRef, note: input.note, confirmGatewayNotExecuted: needsGatewayConfirm && input.confirmGatewayNotExecuted },
              { onSuccess: onClose },
            ),
          )}
        >
          <FieldGroup className="gap-4">
            {needsGatewayConfirm ? (
              <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                <p className="flex items-start gap-2">
                  <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Lệnh chi PayOS của kỳ này {payout.status === "unknown" ? "không rõ kết quả" : "đang được xử lý"} — PayOS có thể đã chuyển tiền. Bấm
                    &quot;Đối chiếu PayOS&quot; trước; chỉ đánh dấu tay khi bảng điều khiển PayOS cho thấy lệnh KHÔNG được thực hiện.
                  </span>
                </p>
                <Controller
                  control={form.control}
                  name="confirmGatewayNotExecuted"
                  render={({ field }) => (
                    <Field orientation="horizontal" className="items-start">
                      <Checkbox
                        id="mark-paid-confirm"
                        className="mt-0.5"
                        checked={field.value}
                        onCheckedChange={(on) => field.onChange(on === true)}
                        aria-invalid={!!errors.confirmGatewayNotExecuted}
                      />
                      <FieldLabel htmlFor="mark-paid-confirm" className="font-medium">
                        Đã tra bảng điều khiển PayOS: lệnh KHÔNG được thực hiện
                      </FieldLabel>
                    </Field>
                  )}
                />
                <FormMessage message={errors.confirmGatewayNotExecuted?.message} />
              </div>
            ) : null}
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

        {/* Hai mã 409 (chưa xác nhận PayOS / mã chứng từ trùng) nói rõ việc phải làm — câu đã chọn sẵn nên đưa vào `fallback` của khung lỗi chuẩn. */}
        {markPaid.error ? <ApiErrorState error={null} fallback={payoutActionError(markPaid.error, "Đánh dấu đã chi thất bại.")} compact /> : null}

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
