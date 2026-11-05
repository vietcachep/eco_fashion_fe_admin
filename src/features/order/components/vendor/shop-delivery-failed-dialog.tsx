"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FormMessage } from "@/components/shared/form-message";
import { NativeSelect } from "@/components/shared/native-select";
import { DELIVERY_FAILED_REASON_LABEL } from "@/lib/labels";
import { useShopDeliveryFailed } from "@/features/order/hooks/use-shop-orders";
import { deliveryFailedSchema, type DeliveryFailedInput } from "@/features/order/schemas/shop-order-schema";
import { DELIVERY_FAILED_REASON_CODES } from "@/features/order/types/shop-order";

/* Thân tách riêng: mỗi lần mở là một form trống mới (xem shop-order-status-dialog). */
function DeliveryFailedBody({ code, paidOnline, onClose }: { code: string; paidOnline: boolean; onClose: () => void }) {
  const report = useShopDeliveryFailed(code);
  const [goodsReturned, setGoodsReturned] = useState(false);
  const form = useForm<DeliveryFailedInput>({ resolver: zodResolver(deliveryFailedSchema), defaultValues: { reasonCode: "refused", note: "" } });
  const errors = form.formState.errors;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Giao không thành công — đơn {code}</DialogTitle>
        <DialogDescription>
          Dùng khi đơn đang giao mà không giao được (khách từ chối nhận, không liên lạc được, sai địa chỉ, hàng thất lạc hoặc hư hỏng…). Đơn sẽ <b>bị huỷ</b>; khách và
          bộ phận chăm sóc khách hàng của sàn nhận thông báo kèm ghi chú của bạn.
        </DialogDescription>
      </DialogHeader>

      {paidOnline ? (
        <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <p>
            Khách đã thanh toán online nên hệ thống sẽ <b>hoàn đủ tiền</b> cho khách; khoản này được trừ khỏi doanh thu của shop khi đối soát.
          </p>
        </div>
      ) : (
        <p className="rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">Đơn chưa thu tiền (COD) nên không có khoản nào phải hoàn cho khách.</p>
      )}

      <form
        id="shop-delivery-failed-form"
        noValidate
        onSubmit={form.handleSubmit((input) => report.mutate({ reasonCode: input.reasonCode, note: input.note, goodsReturned }, { onSuccess: onClose }))}
      >
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="df-reason">Lý do</FieldLabel>
            <NativeSelect id="df-reason" aria-invalid={!!errors.reasonCode} {...form.register("reasonCode")}>
              {DELIVERY_FAILED_REASON_CODES.map((r) => (
                <option key={r} value={r}>
                  {DELIVERY_FAILED_REASON_LABEL[r]}
                </option>
              ))}
            </NativeSelect>
            <FormMessage message={errors.reasonCode?.message} />
          </Field>
          <Field>
            <FieldLabel htmlFor="df-note">Ghi chú cụ thể</FieldLabel>
            <Textarea id="df-note" rows={3} placeholder="Vd: Shipper đã thử giao 3 lần, khách từ chối nhận." aria-invalid={!!errors.note} {...form.register("note")} />
            <FormMessage message={errors.note?.message} />
          </Field>
          <Field orientation="horizontal" className="items-start">
            <Checkbox id="df-returned" className="mt-0.5" checked={goodsReturned} onCheckedChange={(on) => setGoodsReturned(on === true)} />
            <FieldLabel htmlFor="df-returned" className="flex-col items-start gap-0.5 font-normal">
              <span className="font-medium">Hàng đã về tay shop</span>
              <span className="text-xs text-muted-foreground">
                Chỉ tích khi bạn đã nhận lại hàng — hệ thống sẽ nhập kho lại. Chưa nhận được hàng thì để trống, khi hàng về bấm &ldquo;Hàng đã về kho&rdquo; ở chi tiết đơn (trong 30 ngày).
              </span>
            </FieldLabel>
          </Field>
        </FieldGroup>
      </form>

      {report.error ? <ApiErrorState error={report.error} fallback="Báo giao không thành công thất bại." compact /> : null}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" form="shop-delivery-failed-form" variant="destructive" disabled={report.isPending}>
          {report.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Xác nhận &amp; huỷ đơn
        </Button>
      </DialogFooter>
    </>
  );
}

/* Shop báo đơn đang giao giao không thành công (lối thoát cho đơn kẹt `shipping`; quyền `shop.order.update` từ PLAN-0031 §2.4). */
export function ShopDeliveryFailedDialog({
  code,
  paidOnline,
  open,
  onOpenChange,
}: {
  code: string;
  /** Đơn online đã thu tiền → hệ thống hoàn đủ cho khách. */
  paidOnline: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DeliveryFailedBody code={code} paidOnline={paidOnline} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
