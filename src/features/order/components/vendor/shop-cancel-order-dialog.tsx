"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FormMessage } from "@/components/shared/form-message";
import { useShopCancelOrder } from "@/features/order/hooks/use-shop-orders";
import { shopCancelOrderSchema, type ShopCancelOrderInput } from "@/features/order/schemas/shop-order-schema";

/* Thân dialog tách riêng: mỗi lần mở là một form trống mới (xem shop-order-status-dialog). */
function CancelDialogBody({ code, paidOnline, onClose }: { code: string; paidOnline: boolean; onClose: () => void }) {
  const cancel = useShopCancelOrder(code);
  const form = useForm<ShopCancelOrderInput>({ resolver: zodResolver(shopCancelOrderSchema), defaultValues: { reason: "" } });
  const errors = form.formState.errors;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Huỷ đơn {code}?</DialogTitle>
        <DialogDescription>
          Hàng đang giữ được nhả về kho.{" "}
          {paidOnline
            ? "Khách đã thanh toán online nên hệ thống tự tạo yêu cầu hoàn tiền cho khách."
            : "Đơn chưa thu tiền nên không có khoản nào phải hoàn."}{" "}
          Lý do huỷ được ghi vào lịch sử và gửi cho khách. Chỉ huỷ được khi đơn chưa đóng gói.
        </DialogDescription>
      </DialogHeader>
      <form id="shop-cancel-form" noValidate onSubmit={form.handleSubmit((input) => cancel.mutate(input.reason, { onSuccess: onClose }))}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="shop-cancel-reason">Lý do huỷ</FieldLabel>
            <Textarea
              id="shop-cancel-reason"
              rows={3}
              placeholder="Hết hàng / khách yêu cầu / không liên lạc được…"
              aria-invalid={!!errors.reason}
              {...form.register("reason")}
            />
            <FormMessage message={errors.reason?.message} />
          </Field>
        </FieldGroup>
      </form>
      {cancel.error ? <ApiErrorState error={cancel.error} fallback="Huỷ đơn thất bại." compact /> : null}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Không huỷ
        </Button>
        <Button type="submit" form="shop-cancel-form" variant="destructive" disabled={cancel.isPending}>
          {cancel.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Huỷ đơn
        </Button>
      </DialogFooter>
    </>
  );
}

/* Vendor huỷ đơn — bắt buộc lý do (5–255 ký tự, backend ShopCancelOrderRequest). */
export function ShopCancelOrderDialog({
  code,
  paidOnline,
  open,
  onOpenChange,
}: {
  code: string;
  /** Đơn online đã thanh toán → huỷ sẽ sinh yêu cầu hoàn tiền. */
  paidOnline: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <CancelDialogBody code={code} paidOnline={paidOnline} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
