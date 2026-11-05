"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
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
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FormMessage } from "@/components/shared/form-message";
import { NativeSelect } from "@/components/shared/native-select";
import { CANCEL_REASON_LABEL } from "@/lib/labels";
import { cancelOrderErrorMessage, useCancelOrder } from "@/features/order/hooks/use-orders";
import { buildCancelOrderSchema, type CancelOrderInput } from "@/features/order/schemas/order-schema";
import { ADMIN_CANCEL_REASON_CODES, isInTransitStatus } from "@/features/order/types/order";

/* Thân tách riêng: mỗi lần mở là một form trống mới (không setState/reset trong useEffect — React Compiler lint). */
function CancelBody({ code, status, onClose }: { code: string; status: string; onClose: () => void }) {
  const cancel = useCancelOrder(code);
  const shipping = status === "shipping";
  const packing = status === "packing";
  const strict = isInTransitStatus(status);
  const schema = useMemo(() => buildCancelOrderSchema(strict), [strict]);
  const form = useForm<CancelOrderInput>({
    resolver: zodResolver(schema),
    // Huỷ đơn đã đóng gói / đang giao gần như luôn là tranh chấp; đơn chưa đóng gói thì mặc định "khác" cho CSKH tự chọn.
    defaultValues: { reasonCode: strict ? "dispute" : "other", reason: "" },
  });
  const errors = form.formState.errors;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{shipping ? `Huỷ đơn đang giao ${code}?` : packing ? `Huỷ đơn đang đóng gói ${code}?` : `Huỷ đơn ${code}?`}</DialogTitle>
        <DialogDescription>
          {shipping
            ? "Chỉ dùng khi tranh chấp (hàng thất lạc, khách từ chối nhận, không liên lạc được…). Nếu khách đã thanh toán online, hệ thống tạo yêu cầu hoàn tiền; shop và khách nhận thông báo kèm lý do."
            : packing
              ? "Chỉ dùng khi tranh chấp hoặc shop mất liên lạc, không xử lý được. Hàng được nhập lại kho; nếu khách đã thanh toán online, hệ thống tạo yêu cầu hoàn tiền. Khách và người xử lý đơn của shop đều nhận thông báo kèm lý do."
              : "Hàng đang giữ được nhả về kho; nếu khách đã thanh toán, hệ thống tạo yêu cầu hoàn tiền."}
        </DialogDescription>
      </DialogHeader>

      {shipping ? (
        <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <p>
            Hàng đang ở đơn vị vận chuyển nên hệ thống <b>KHÔNG tự nhập kho lại</b> — shop tự kiểm khi hàng về. Đơn còn yêu cầu đổi trả đang mở thì chưa huỷ được.
          </p>
        </div>
      ) : null}

      <form
        id="cancel-form"
        noValidate
        onSubmit={form.handleSubmit((input) => cancel.mutate({ reason: input.reason, reasonCode: input.reasonCode }, { onSuccess: onClose }))}
      >
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="cancel-code">Mã lý do</FieldLabel>
            <NativeSelect id="cancel-code" aria-invalid={!!errors.reasonCode} {...form.register("reasonCode")}>
              {ADMIN_CANCEL_REASON_CODES.map((c) => (
                <option key={c} value={c}>
                  {CANCEL_REASON_LABEL[c] ?? c}
                </option>
              ))}
            </NativeSelect>
            <FormMessage message={errors.reasonCode?.message} />
          </Field>
          <Field>
            <FieldLabel htmlFor="cancel-reason">{strict ? "Lý do huỷ (tối thiểu 10 ký tự)" : "Lý do huỷ"}</FieldLabel>
            <Textarea
              id="cancel-reason"
              rows={3}
              placeholder={
                strict
                  ? "Vd: Shop không phản hồi sau 3 ngày, khách yêu cầu huỷ; CSKH đã liên hệ shop hai lần không được."
                  : "Hết hàng / khách yêu cầu / không liên lạc được…"
              }
              aria-invalid={!!errors.reason}
              {...form.register("reason")}
            />
            <FormMessage message={errors.reason?.message} />
          </Field>
        </FieldGroup>
      </form>

      {/* Câu lỗi đã được chọn sẵn (câu riêng cho ORDER_HAS_OPEN_RETURN, còn lại là câu của backend) nên đưa vào `fallback` — vẫn dùng khung lỗi chuẩn. */}
      {cancel.error ? <ApiErrorState error={null} fallback={cancelOrderErrorMessage(cancel.error, "Huỷ đơn thất bại.")} compact /> : null}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Không huỷ
        </Button>
        <Button type="submit" form="cancel-form" variant="destructive" disabled={cancel.isPending}>
          {cancel.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Huỷ đơn
        </Button>
      </DialogFooter>
    </>
  );
}

/*
 * Sàn huỷ đơn thay khách — chọn mã lý do (tranh chấp · nghi gian lận · khác) + lý do chi tiết (ghi lịch sử, báo khách và shop). Đơn ĐÓNG GÓI
 * hoặc ĐANG GIAO huỷ khi tranh chấp (PLAN-0027 / PLAN-0022) cần lý do ≥ 10 ký tự; lỗi `ORDER_HAS_OPEN_RETURN` (còn yêu cầu đổi trả mở) hiện
 * thông điệp nói rõ việc cần làm trước.
 */
export function CancelOrderDialog({
  code,
  status,
  open,
  onOpenChange,
}: {
  code: string;
  /** Trạng thái hiện tại — `packing` / `shipping` làm luật lý do chặt hơn; `shipping` thêm cảnh báo không tự nhập kho. */
  status: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <CancelBody code={code} status={status} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
