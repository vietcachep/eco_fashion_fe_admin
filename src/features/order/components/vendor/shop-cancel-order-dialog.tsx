"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FormMessage } from "@/components/shared/form-message";
import { NativeSelect } from "@/components/shared/native-select";
import { CANCEL_REASON_LABEL } from "@/lib/labels";
import { useShopCancelOrder } from "@/features/order/hooks/use-shop-orders";
import { shopCancelOrderSchema, type ShopCancelOrderInput } from "@/features/order/schemas/shop-order-schema";
import { SHOP_CANCEL_REASON_CODES, shopCancelPenalty } from "@/features/order/types/shop-order";

/*
 * Thân dialog tách riêng: mỗi lần mở là một form trống mới (xem shop-order-status-dialog). Cảnh báo điểm vi phạm đổi THEO LỰA CHỌN
 * (cùng luật với backend `shopCancelViolation`) để shop biết trước hậu quả của đúng lý do mình chọn.
 */
function CancelDialogBody({
  code,
  status,
  paidOnline,
  hadRejectedRequest,
  carrierManaged = false,
  onClose,
}: {
  code: string;
  status: string;
  paidOnline: boolean;
  hadRejectedRequest: boolean;
  carrierManaged?: boolean;
  onClose: () => void;
}) {
  const cancel = useShopCancelOrder(code);
  const form = useForm<ShopCancelOrderInput>({
    resolver: zodResolver(shopCancelOrderSchema),
    defaultValues: { reasonCode: undefined, note: "" },
  });
  const errors = form.formState.errors;
  const reasonCode = useWatch({ control: form.control, name: "reasonCode" });
  const penalty = reasonCode ? shopCancelPenalty({ reasonCode, status, hadRejectedRequest }) : null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Huỷ đơn {code}?</DialogTitle>
        <DialogDescription>
          Hàng đã giữ cho đơn được nhập lại kho.{" "}
          {paidOnline
            ? "Khách đã thanh toán online nên hệ thống tự tạo yêu cầu hoàn tiền cho khách."
            : "Đơn chưa thu tiền nên không có khoản nào phải hoàn."}{" "}
          {carrierManaged ? "Lý do được ghi vào lịch sử. Nếu đã có vận đơn, hệ thống cần hãng xác nhận huỷ trước khi nhập kho hoặc hoàn tiền; hãng đã lấy kiện thì không huỷ trực tiếp được." : "Lý do huỷ được ghi vào lịch sử và gửi cho khách. Chỉ huỷ được khi đơn chưa giao cho vận chuyển."}
        </DialogDescription>
      </DialogHeader>

      {penalty ? (
        <div role="alert" className="flex gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <p>
            Việc {penalty} sẽ bị tính <b>+1 điểm vi phạm</b> cho gian hàng. Điểm tích luỹ trong 30 ngày; vượt ngưỡng sàn sẽ xem xét tạm khoá gian hàng.
          </p>
        </div>
      ) : (
        <p className="rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">
          Lưu ý: huỷ vì <b>hết hàng</b>, <b>sai giá</b>, huỷ đơn <b>đã đóng gói</b> hoặc huỷ sau khi đã từ chối yêu cầu huỷ của khách đều bị tính 1 điểm vi phạm.
        </p>
      )}

      <form
        id="shop-cancel-form"
        noValidate
        onSubmit={form.handleSubmit((input) => cancel.mutate({ reasonCode: input.reasonCode, note: input.note || undefined }, { onSuccess: onClose }))}
      >
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="shop-cancel-code">Lý do huỷ</FieldLabel>
            <NativeSelect id="shop-cancel-code" aria-invalid={!!errors.reasonCode} {...form.register("reasonCode")}>
              <option value="">Chọn lý do huỷ…</option>
              {SHOP_CANCEL_REASON_CODES.map((c) => (
                <option key={c} value={c}>
                  {CANCEL_REASON_LABEL[c] ?? c}
                </option>
              ))}
            </NativeSelect>
            <FormMessage message={errors.reasonCode?.message} />
          </Field>
          <Field>
            <FieldLabel htmlFor="shop-cancel-note">{reasonCode === "other" ? "Ghi rõ lý do" : "Ghi chú (tuỳ chọn)"}</FieldLabel>
            <Textarea
              id="shop-cancel-note"
              rows={3}
              placeholder="Vd: Lô hàng về trễ 2 tuần, đã báo khách qua điện thoại."
              aria-invalid={!!errors.note}
              {...form.register("note")}
            />
            <FormMessage message={errors.note?.message} />
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

/*
 * Vendor huỷ đơn (quyền `shop.order.cancel`): chờ xác nhận · đã xác nhận · ĐANG ĐÓNG GÓI. Chọn MÃ lý do chuẩn (+ ghi chú) thay vì gõ tự do —
 * backend dùng mã để quyết định điểm vi phạm. Nút mở dialog này ẩn theo cờ `canCancel` của response shop.
 */
export function ShopCancelOrderDialog({
  code,
  status,
  paidOnline,
  hadRejectedRequest,
  carrierManaged = false,
  open,
  onOpenChange,
}: {
  code: string;
  /** Trạng thái hiện tại của đơn — `packing` làm việc huỷ bị tính vi phạm (trừ lý do "khách yêu cầu"). */
  status: string;
  /** Đơn online đã thanh toán → huỷ sẽ sinh yêu cầu hoàn tiền. */
  paidOnline: boolean;
  /** Shop đã TỪ CHỐI yêu cầu huỷ của khách rồi mới tự huỷ → luôn bị tính vi phạm. */
  hadRejectedRequest: boolean;
  carrierManaged?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <CancelDialogBody
          code={code}
          status={status}
          paidOnline={paidOnline}
          hadRejectedRequest={hadRejectedRequest}
          carrierManaged={carrierManaged}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
