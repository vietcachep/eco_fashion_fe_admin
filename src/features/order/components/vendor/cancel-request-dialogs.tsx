"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FormMessage } from "@/components/shared/form-message";
import { useShopAcceptCancelRequest, useShopRejectCancelRequest } from "@/features/order/hooks/use-shop-orders";
import { shopReasonSchema, type ShopReasonInput } from "@/features/order/schemas/shop-order-schema";

/* Thân tách riêng: mỗi lần mở là một khung mới (kèm trạng thái lỗi của lần trước được xoá) — xem shop-order-status-dialog. */
function AcceptBody({ code, paidOnline, onClose }: { code: string; paidOnline: boolean; onClose: () => void }) {
  const accept = useShopAcceptCancelRequest(code);
  return (
    <>
      <DialogHeader>
        <DialogTitle>Chấp nhận yêu cầu huỷ đơn {code}?</DialogTitle>
        <DialogDescription>
          Đơn sẽ được huỷ, hàng đã giữ nhập lại kho.{" "}
          {paidOnline ? "Khách đã thanh toán online nên hệ thống tự tạo yêu cầu hoàn tiền cho khách. " : "Đơn chưa thu tiền nên không có khoản nào phải hoàn. "}
          Chấp nhận yêu cầu của khách <b>không bị tính điểm vi phạm</b>.
        </DialogDescription>
      </DialogHeader>
      {accept.error ? <ApiErrorState error={accept.error} fallback="Chấp nhận yêu cầu huỷ thất bại." compact /> : null}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Để sau
        </Button>
        <Button variant="destructive" disabled={accept.isPending} onClick={() => accept.mutate(undefined, { onSuccess: onClose })}>
          {accept.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Chấp nhận &amp; huỷ đơn
        </Button>
      </DialogFooter>
    </>
  );
}

/* Chấp nhận yêu cầu huỷ của khách (quyền shop.order.cancel): huỷ đơn + nhập kho + hoàn tiền, không vi phạm. */
export function CancelRequestAcceptDialog({
  code,
  paidOnline,
  open,
  onOpenChange,
}: {
  code: string;
  paidOnline: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <AcceptBody code={code} paidOnline={paidOnline} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function RejectBody({ code, onClose }: { code: string; onClose: () => void }) {
  const reject = useShopRejectCancelRequest(code);
  const form = useForm<ShopReasonInput>({ resolver: zodResolver(shopReasonSchema), defaultValues: { reason: "" } });
  const errors = form.formState.errors;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Từ chối yêu cầu huỷ đơn {code}</DialogTitle>
        <DialogDescription>Đơn tiếp tục được xử lý và giao. Khách đọc được lý do bạn nêu bên dưới nên hãy ghi rõ vì sao không huỷ được.</DialogDescription>
      </DialogHeader>

      <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
        <p>
          Sau khi từ chối, nếu shop <b>tự huỷ</b> đơn này sẽ bị tính <b>+1 điểm vi phạm</b>.
        </p>
      </div>

      <form id="cancel-request-reject-form" noValidate onSubmit={form.handleSubmit((input) => reject.mutate({ reason: input.reason }, { onSuccess: onClose }))}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="crr-reason">Lý do từ chối (10–500 ký tự)</FieldLabel>
            <Textarea
              id="crr-reason"
              rows={3}
              placeholder="Vd: Hàng đã đóng gói xong và bàn giao cho đơn vị vận chuyển, không thể huỷ."
              aria-invalid={!!errors.reason}
              {...form.register("reason")}
            />
            <FormMessage message={errors.reason?.message} />
          </Field>
        </FieldGroup>
      </form>

      {reject.error ? <ApiErrorState error={reject.error} fallback="Từ chối yêu cầu huỷ thất bại." compact /> : null}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" form="cancel-request-reject-form" disabled={reject.isPending}>
          {reject.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Từ chối yêu cầu
        </Button>
      </DialogFooter>
    </>
  );
}

/* Từ chối yêu cầu huỷ của khách (quyền shop.order.cancel): lý do 10–500 ký tự, khách đọc được. */
export function CancelRequestRejectDialog({ code, open, onOpenChange }: { code: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <RejectBody code={code} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
