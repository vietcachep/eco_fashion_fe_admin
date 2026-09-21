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
import { ORDER_STATUS } from "@/lib/labels";
import { useUpdateOrderStatus } from "@/features/order/hooks/use-orders";
import { STATUS_ACTION_LABEL } from "@/features/order/types/order";
import { updateStatusSchema, type UpdateStatusInput } from "@/features/order/schemas/order-schema";

/* Chuyển trạng thái đơn (xác nhận / đóng gói / giao / đã giao / hoàn tất) + link vận chuyển, ghi chú. */
export function UpdateStatusDialog({ code, next, onClose }: { code: string; next: string | null; onClose: () => void }) {
  const update = useUpdateOrderStatus(code);
  const form = useForm<UpdateStatusInput>({
    resolver: zodResolver(updateStatusSchema),
    defaultValues: { status: "confirmed", trackingUrl: "", note: "" },
  });
  const errors = form.formState.errors;

  useEffect(() => {
    if (next) form.reset({ status: next as UpdateStatusInput["status"], trackingUrl: "", note: "" });
  }, [next, form]);

  return (
    <Dialog open={!!next} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{next ? STATUS_ACTION_LABEL[next] : ""}</DialogTitle>
          <DialogDescription>
            Đơn {code} → <b>{next ? ORDER_STATUS[next]?.label : ""}</b>. Khách nhận thông báo ngay.
          </DialogDescription>
        </DialogHeader>
        <form
          id="status-form"
          noValidate
          onSubmit={form.handleSubmit((input) =>
            update.mutate(
              { status: input.status, trackingUrl: input.trackingUrl || undefined, note: input.note || undefined },
              { onSuccess: onClose },
            ),
          )}
        >
          <FieldGroup className="gap-4">
            {next === "shipping" ? (
              <Field>
                <FieldLabel htmlFor="st-tracking">Link theo dõi vận chuyển (tuỳ chọn)</FieldLabel>
                <Input id="st-tracking" placeholder="https://…" aria-invalid={!!errors.trackingUrl} {...form.register("trackingUrl")} />
                <FormMessage message={errors.trackingUrl?.message} />
              </Field>
            ) : null}
            <Field>
              <FieldLabel htmlFor="st-note">Ghi chú nội bộ (tuỳ chọn)</FieldLabel>
              <Input id="st-note" aria-invalid={!!errors.note} {...form.register("note")} />
              <FormMessage message={errors.note?.message} />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" form="status-form" disabled={update.isPending}>
            {update.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
