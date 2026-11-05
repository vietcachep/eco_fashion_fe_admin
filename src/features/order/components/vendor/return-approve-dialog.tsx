"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FormMessage } from "@/components/shared/form-message";
import type { ApproveReturnRequest, ShopReturnRequestResponse } from "@/lib/api/generated/model";
import { useApproveReturn } from "@/features/order/hooks/use-shop-returns";
import { buildApproveReturnSchema, type ApproveReturnInput } from "@/features/order/schemas/return-schema";

/*
 * Thân hộp thoại DUYỆT tách riêng + `key` theo yêu cầu: mỗi lần mở là một form mới, địa chỉ điền sẵn từ `suggestedReturnAddress`
 * (không cần setState/reset trong useEffect — React Compiler lint set-state-in-effect). Lỗi nghiệp vụ của backend hiện ngay trong khung.
 */
function ApproveBody({ request, onClose }: { request: ShopReturnRequestResponse; onClose: () => void }) {
  const approve = useApproveReturn(request.id);
  const calculated = Number(request.calculatedRefundAmount.amount);
  const requireReturn = request.requireReturn;
  const suggested = request.suggestedReturnAddress;
  const schema = useMemo(() => buildApproveReturnSchema({ calculated, requireReturn }), [calculated, requireReturn]);

  const form = useForm<ApproveReturnInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      refundAmount: Number(request.refundAmount.amount),
      adjustReason: request.adjustReason ?? "",
      returnName: suggested?.name ?? "",
      returnPhone: suggested?.phone ?? "",
      returnAddress: suggested?.address ?? "",
    },
  });
  const errors = form.formState.errors;

  const submit = (input: ApproveReturnInput) => {
    const reduced = input.refundAmount < calculated;
    const body: ApproveReturnRequest = {
      // Bỏ trống = số hệ thống đã tính; chỉ gửi khi shop GIẢM (kèm lý do bắt buộc).
      refundAmount: reduced ? String(input.refundAmount) : undefined,
      adjustReason: reduced ? input.adjustReason : undefined,
      returnAddress: requireReturn ? { name: input.returnName, phone: input.returnPhone, address: input.returnAddress } : undefined,
    };
    approve.mutate(body, { onSuccess: onClose });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Duyệt yêu cầu đổi trả đơn {request.orderCode}</DialogTitle>
        <DialogDescription>
          {requireReturn
            ? "Sau khi duyệt, khách nhận địa chỉ bên dưới để gửi hàng về. Bạn xác nhận đã nhận hàng thì hệ thống mới nhập kho và hoàn tiền cho khách."
            : "Khách báo chưa nhận được hàng nên không cần trả hàng: duyệt nghĩa là hoàn tiền ngay cho khách, không nhập kho."}
        </DialogDescription>
      </DialogHeader>

      {!requireReturn ? (
        <p className="rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">
          Nếu đơn là <b>COD</b> và shop đã báo giao: khách chưa từng trả tiền mặt nên duyệt = <b>đảo ghi thu COD</b>, KHÔNG hoàn tiền (số tiền bên dưới được bỏ qua);
          ví cọc COD của shop được trả lại hoa hồng đã trừ. Đơn thanh toán online thì hoàn tiền như thường.
        </p>
      ) : null}

      <form id="return-approve-form" noValidate onSubmit={form.handleSubmit(submit)}>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="ra-amount">Số tiền hoàn cho khách (VND)</FieldLabel>
            <Input id="ra-amount" type="number" inputMode="numeric" min={0} max={calculated} step={1000} aria-invalid={!!errors.refundAmount} {...form.register("refundAmount", { valueAsNumber: true })} />
            <p className="text-xs text-muted-foreground">
              Hệ thống tính <b>{request.calculatedRefundAmount.display}</b>. Shop chỉ được giảm, không được tăng; giảm thì phải nêu lý do.
            </p>
            <FormMessage message={errors.refundAmount?.message} />
          </Field>

          <Field>
            <FieldLabel htmlFor="ra-adjust">Lý do giảm số tiền hoàn</FieldLabel>
            <Textarea id="ra-adjust" rows={2} placeholder="Chỉ cần khi giảm số tiền: vd hàng đã qua sử dụng, thiếu phụ kiện…" aria-invalid={!!errors.adjustReason} {...form.register("adjustReason")} />
            <FormMessage message={errors.adjustReason?.message} />
          </Field>

          {requireReturn ? (
            <fieldset className="flex flex-col gap-3 rounded-lg border p-3">
              <legend className="px-1 text-sm font-medium">Địa chỉ nhận hàng trả</legend>
              <p className="text-xs text-muted-foreground">
                {suggested
                  ? "Điền sẵn từ địa chỉ shop dùng gần nhất — sửa nếu lần này gửi về nơi khác."
                  : "Đây là lần đầu shop khai địa chỉ nhận hàng trả; các lần sau hệ thống sẽ điền sẵn."}
              </p>
              <Field>
                <FieldLabel htmlFor="ra-name">Người nhận</FieldLabel>
                <Input id="ra-name" autoComplete="off" placeholder="Kho Shop An Nhiên" aria-invalid={!!errors.returnName} {...form.register("returnName")} />
                <FormMessage message={errors.returnName?.message} />
              </Field>
              <Field>
                <FieldLabel htmlFor="ra-phone">Số điện thoại</FieldLabel>
                <Input id="ra-phone" type="tel" inputMode="tel" autoComplete="off" placeholder="0901234567" aria-invalid={!!errors.returnPhone} {...form.register("returnPhone")} />
                <FormMessage message={errors.returnPhone?.message} />
              </Field>
              <Field>
                <FieldLabel htmlFor="ra-address">Địa chỉ</FieldLabel>
                <Textarea id="ra-address" rows={2} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" aria-invalid={!!errors.returnAddress} {...form.register("returnAddress")} />
                <FormMessage message={errors.returnAddress?.message} />
              </Field>
            </fieldset>
          ) : null}
        </FieldGroup>
      </form>

      {approve.error ? <ApiErrorState error={approve.error} fallback="Duyệt yêu cầu thất bại." compact /> : null}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" form="return-approve-form" disabled={approve.isPending}>
          {approve.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Duyệt yêu cầu
        </Button>
      </DialogFooter>
    </>
  );
}

/* Shop duyệt yêu cầu đổi trả: chỉnh số tiền hoàn (chỉ giảm, kèm lý do) + khai địa chỉ nhận hàng trả. */
export function ReturnApproveDialog({
  request,
  open,
  onOpenChange,
}: {
  request: ShopReturnRequestResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <ApproveBody key={request.id} request={request} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
