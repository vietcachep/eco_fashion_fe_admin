"use client";

import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FormMessage } from "@/components/shared/form-message";
import { NativeSelect } from "@/components/shared/native-select";
import type { ShopUpdateOrderStatusRequest, ShopUpdateOrderStatusRequestStatus } from "@/lib/api/generated/model";
import { CARRIER_LABEL, ORDER_STATUS } from "@/lib/labels";
import { useShopUpdateOrderStatus } from "@/features/order/hooks/use-shop-orders";
import { buildShopStatusSchema, type ShopStatusInput } from "@/features/order/schemas/shop-order-schema";
import { CARRIER_CODES, VENDOR_ACTION_LABEL, carrierNeedsTrackingUrl, isCarrierCode } from "@/features/order/types/shop-order";

const HINT: Record<ShopUpdateOrderStatusRequestStatus, string> = {
  confirmed: "Xác nhận nghĩa là shop nhận đơn và giữ hàng cho khách — kho được trừ thật. Khách nhận thông báo ngay.",
  packing: "Chuyển sang đóng gói khi bắt đầu lấy hàng. Đóng gói xong, bấm \"Giao cho vận chuyển\" ở bước sau.",
  shipping: "Chọn hãng vận chuyển và nhập mã vận đơn — khách nhận thông báo kèm hãng, mã và link tra cứu để tự xem hành trình.",
  delivered: "Chỉ xác nhận khi khách đã nhận hàng. Khách nhận thông báo ngay.",
};

/*
 * Thân dialog tách riêng + `key` theo trạng thái đích: mỗi lần mở là một form
 * mới (không cần setState/reset trong useEffect — React Compiler lint
 * set-state-in-effect). Lỗi nghiệp vụ của backend hiện ngay trong khung này
 * (ORDER_TRACKING_REQUIRED, ORDER_NOT_RECEIVED_OPEN, ORDER_INVALID_TRANSITION…).
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
  const shipping = next === "shipping";
  const schema = useMemo(() => buildShopStatusSchema(shipping), [shipping]);
  const form = useForm<ShopStatusInput>({
    resolver: zodResolver(schema),
    defaultValues: { carrier: "", trackingCode: "", trackingUrl: "", note: "" },
  });
  const errors = form.formState.errors;
  const carrier = useWatch({ control: form.control, name: "carrier" });
  // Hãng có mẫu link (GHN, GHTK…) thì backend tự sinh link tra cứu; chỉ hãng khác / Ahamove mới cho shop nhập link.
  const showUrl = shipping && carrier !== "" && carrierNeedsTrackingUrl(carrier);

  const submit = (input: ShopStatusInput) => {
    const body: ShopUpdateOrderStatusRequest = { status: next, note: input.note || undefined };
    if (shipping && isCarrierCode(input.carrier)) {
      body.carrier = input.carrier;
      body.trackingCode = input.trackingCode;
      if (carrierNeedsTrackingUrl(input.carrier) && input.trackingUrl) body.trackingUrl = input.trackingUrl;
    }
    update.mutate(body, { onSuccess: onClose });
  };

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
            Đơn COD: đơn vị vận chuyển thu hộ tiền mặt và nộp về <b>sàn</b>; shop không giữ tiền mặt. Tiền được đối soát và chi cho shop như đơn online.
          </p>
        </div>
      ) : null}

      <form id="shop-status-form" noValidate onSubmit={form.handleSubmit(submit)}>
        <FieldGroup className="gap-4">
          {shipping ? (
            <>
              <Field>
                <FieldLabel htmlFor="shop-st-carrier">Hãng vận chuyển</FieldLabel>
                <NativeSelect id="shop-st-carrier" aria-invalid={!!errors.carrier} {...form.register("carrier")}>
                  <option value="">Chọn hãng vận chuyển…</option>
                  {CARRIER_CODES.map((c) => (
                    <option key={c} value={c}>
                      {CARRIER_LABEL[c] ?? c}
                    </option>
                  ))}
                </NativeSelect>
                <FormMessage message={errors.carrier?.message} />
              </Field>
              <Field>
                <FieldLabel htmlFor="shop-st-code">Mã vận đơn</FieldLabel>
                <Input
                  id="shop-st-code"
                  autoComplete="off"
                  autoCapitalize="characters"
                  maxLength={40}
                  placeholder="Vd: GHN123456789"
                  aria-invalid={!!errors.trackingCode}
                  {...form.register("trackingCode")}
                />
                <p className="text-xs text-muted-foreground">4–40 ký tự gồm chữ, số hoặc dấu gạch ngang, đúng như in trên phiếu gửi của hãng.</p>
                <FormMessage message={errors.trackingCode?.message} />
              </Field>
              {showUrl ? (
                <Field>
                  <FieldLabel htmlFor="shop-st-tracking">Link theo dõi vận chuyển (tuỳ chọn)</FieldLabel>
                  <Input id="shop-st-tracking" inputMode="url" placeholder="https://…" aria-invalid={!!errors.trackingUrl} {...form.register("trackingUrl")} />
                  <p className="text-xs text-muted-foreground">Hãng này chưa có link tra cứu tự động — nhập link https nếu muốn khách tự xem hành trình.</p>
                  <FormMessage message={errors.trackingUrl?.message} />
                </Field>
              ) : carrier !== "" ? (
                <p className="rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">Link tra cứu hành trình sẽ được hệ thống tạo tự động theo hãng và mã vận đơn.</p>
              ) : null}
            </>
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

/* Chuyển trạng thái đơn của vendor: xác nhận · đóng gói · giao vận chuyển (BẮT BUỘC hãng + mã vận đơn) · đã giao. */
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
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        {next ? <StatusDialogBody key={next} code={code} next={next} isCod={isCod} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
