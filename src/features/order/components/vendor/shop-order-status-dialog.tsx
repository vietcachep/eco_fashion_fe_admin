"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FormMessage } from "@/components/shared/form-message";
import type { ShopUpdateOrderStatusRequestStatus } from "@/lib/api/generated/model";
import { ORDER_STATUS } from "@/lib/labels";
import { useShopUpdateOrderStatus } from "@/features/order/hooks/use-shop-orders";
import { shopStatusSchema, type ShopStatusInput } from "@/features/order/schemas/shop-order-schema";
import { VENDOR_ACTION_LABEL } from "@/features/order/types/shop-order";

const HINT: Record<ShopUpdateOrderStatusRequestStatus, string> = {
  confirmed: "Xác nhận nghĩa là shop nhận đơn và giữ hàng cho khách — kho được trừ thật. Khách nhận thông báo ngay.",
  packing: "Chuyển sang đóng gói khi bắt đầu lấy hàng. Đóng gói xong, bấm \"Giao cho vận chuyển\" ở bước sau.",
  shipping: "Khách nhận thông báo đơn đã giao cho vận chuyển. Nhập link theo dõi (https) nếu có để khách tự xem hành trình.",
  delivered: "Chỉ xác nhận khi khách đã nhận hàng. Khách nhận thông báo ngay.",
};

/*
 * Thân dialog tách riêng + `key` theo trạng thái đích: mỗi lần mở là một form
 * mới (không cần setState/reset trong useEffect — React Compiler lint
 * set-state-in-effect). Lỗi nghiệp vụ của backend hiện ngay trong khung này.
 */
function StatusDialogBody({
  code,
  next,
  isCod,
  onClose,
}: {
  code: string;
  next: ShopUpdateOrderStatusRequestStatus;
  isCod: boolean;
  onClose: () => void;
}) {
  const update = useShopUpdateOrderStatus(code);
  const form = useForm<ShopStatusInput>({
    resolver: zodResolver(shopStatusSchema),
    defaultValues: { trackingUrl: "", note: "" },
  });
  const errors = form.formState.errors;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{VENDOR_ACTION_LABEL[next]}</DialogTitle>
        <DialogDescription>
          Đơn {code} → <b>{ORDER_STATUS[next]?.label}</b>. {HINT[next]}
        </DialogDescription>
      </DialogHeader>

      {next === "delivered" && isCod ? (
        <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <p>
            Đơn COD: hãy xác nhận <b>đã thu đủ tiền mặt</b> từ khách. Hoa hồng của sàn sẽ được trừ vào ví quỹ COD của shop khi đơn hoàn tất.
          </p>
        </div>
      ) : null}

      <form
        id="shop-status-form"
        noValidate
        onSubmit={form.handleSubmit((input) =>
          update.mutate(
            {
              status: next,
              trackingUrl: next === "shipping" ? input.trackingUrl || undefined : undefined,
              note: input.note || undefined,
            },
            { onSuccess: onClose },
          ),
        )}
      >
        <FieldGroup className="gap-4">
          {next === "shipping" ? (
            <Field>
              <FieldLabel htmlFor="shop-st-tracking">Link theo dõi vận chuyển (tuỳ chọn)</FieldLabel>
              <Input id="shop-st-tracking" inputMode="url" placeholder="https://…" aria-invalid={!!errors.trackingUrl} {...form.register("trackingUrl")} />
              <FormMessage message={errors.trackingUrl?.message} />
            </Field>
          ) : null}
          <Field>
            <FieldLabel htmlFor="shop-st-note">Ghi chú (tuỳ chọn)</FieldLabel>
            <Input id="shop-st-note" placeholder="Hiện trong lịch sử đơn và thông báo gửi khách" aria-invalid={!!errors.note} {...form.register("note")} />
            <FormMessage message={errors.note?.message} />
          </Field>
        </FieldGroup>
      </form>

      {update.error ? <ApiErrorState error={update.error} fallback="Cập nhật trạng thái thất bại." compact /> : null}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" form="shop-status-form" disabled={update.isPending}>
          {update.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Xác nhận
        </Button>
      </DialogFooter>
    </>
  );
}

/* Chuyển trạng thái đơn của vendor: xác nhận · đóng gói · giao vận chuyển (link https) · đã giao. */
export function ShopOrderStatusDialog({
  code,
  next,
  open,
  isCod,
  onOpenChange,
}: {
  code: string;
  /** Giữ nguyên khi đóng để nội dung không nháy trống lúc dialog chạy hiệu ứng đóng. */
  next: ShopUpdateOrderStatusRequestStatus | null;
  open: boolean;
  isCod: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {next ? <StatusDialogBody key={next} code={code} next={next} isCod={isCod} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
