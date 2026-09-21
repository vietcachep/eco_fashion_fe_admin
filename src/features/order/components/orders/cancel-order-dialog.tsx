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
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/shared/form-message";
import { useCancelOrder } from "@/features/order/hooks/use-orders";
import { cancelOrderSchema, type CancelOrderInput } from "@/features/order/schemas/order-schema";

/* Huỷ đơn thay khách — bắt buộc lý do (ghi lịch sử + thông báo khách). */
export function CancelOrderDialog({
  code,
  open,
  onOpenChange,
}: {
  code: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const cancel = useCancelOrder(code);
  const form = useForm<CancelOrderInput>({ resolver: zodResolver(cancelOrderSchema), defaultValues: { reason: "" } });
  const errors = form.formState.errors;

  useEffect(() => {
    if (open) form.reset({ reason: "" });
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Huỷ đơn {code}?</DialogTitle>
          <DialogDescription>Hàng đang giữ được nhả về kho; nếu khách đã thanh toán, hệ thống tạo yêu cầu hoàn tiền.</DialogDescription>
        </DialogHeader>
        <form id="cancel-form" noValidate onSubmit={form.handleSubmit((input) => cancel.mutate(input.reason, { onSuccess: () => onOpenChange(false) }))}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="cancel-reason">Lý do huỷ</FieldLabel>
              <Textarea id="cancel-reason" rows={3} placeholder="Hết hàng / khách yêu cầu / không liên lạc được…" aria-invalid={!!errors.reason} {...form.register("reason")} />
              <FormMessage message={errors.reason?.message} />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Không huỷ
          </Button>
          <Button type="submit" form="cancel-form" variant="destructive" disabled={cancel.isPending}>
            {cancel.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Huỷ đơn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
