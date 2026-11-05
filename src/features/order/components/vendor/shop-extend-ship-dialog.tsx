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
import { formatDateTime } from "@/lib/format";
import { useShopExtendShip } from "@/features/order/hooks/use-shop-orders";
import { shopReasonSchema, type ShopReasonInput } from "@/features/order/schemas/shop-order-schema";

/*
 * Thân tách riêng: mỗi lần mở là một form trống mới (xem shop-order-status-dialog). Lỗi 409 của backend — ORDER_SHIP_ALREADY_EXTENDED
 * (đã gia hạn rồi) · ORDER_SHIP_OVERDUE (đã quá hạn, không gia hạn được) · ORDER_SHIP_NO_DEADLINE (đơn cũ không có hạn) ·
 * ORDER_INVALID_TRANSITION (đơn đã sang trạng thái khác) — hiện nguyên câu của backend ngay trong khung này.
 */
function ExtendBody({ code, shipDueAt, onClose }: { code: string; shipDueAt: string | null | undefined; onClose: () => void }) {
  const extend = useShopExtendShip(code);
  const form = useForm<ShopReasonInput>({ resolver: zodResolver(shopReasonSchema), defaultValues: { reason: "" } });
  const errors = form.formState.errors;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Gia hạn giao hàng — đơn {code}</DialogTitle>
        <DialogDescription>
          Mỗi đơn chỉ được gia hạn <b>một lần</b>, và chỉ khi chưa quá hạn giao
          {shipDueAt ? <> (hạn hiện tại: <b>{formatDateTime(shipDueAt)}</b>)</> : null}. Hạn giao được cộng thêm thời gian giao chuẩn của sàn. Lý do được ghi vào lịch sử đơn.
        </DialogDescription>
      </DialogHeader>

      <form id="shop-extend-form" noValidate onSubmit={form.handleSubmit((input) => extend.mutate({ reason: input.reason }, { onSuccess: onClose }))}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="shop-extend-reason">Lý do gia hạn (10–500 ký tự)</FieldLabel>
            <Textarea
              id="shop-extend-reason"
              rows={3}
              placeholder="Vd: Hàng đặt riêng, xưởng báo thêm 2 ngày mới xong."
              aria-invalid={!!errors.reason}
              {...form.register("reason")}
            />
            <FormMessage message={errors.reason?.message} />
          </Field>
        </FieldGroup>
      </form>

      {extend.error ? <ApiErrorState error={extend.error} fallback="Gia hạn giao hàng thất bại." compact /> : null}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" form="shop-extend-form" disabled={extend.isPending}>
          {extend.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Gia hạn
        </Button>
      </DialogFooter>
    </>
  );
}

/* Shop gia hạn hạn giao MỘT lần (quyền shop.order.update) cho đơn đã xác nhận / đang đóng gói còn hạn. */
export function ShopExtendShipDialog({
  code,
  shipDueAt,
  open,
  onOpenChange,
}: {
  code: string;
  /** Hạn giao hiện tại (hiện cho shop biết đang gia hạn từ mốc nào). */
  shipDueAt?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <ExtendBody code={code} shipDueAt={shipDueAt} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
