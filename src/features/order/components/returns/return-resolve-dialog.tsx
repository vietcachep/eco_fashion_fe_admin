"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FormMessage } from "@/components/shared/form-message";
import type { ReturnRequestResponse } from "@/lib/api/generated/model";
import { cn } from "@/lib/utils";
import { useResolveReturn } from "@/features/order/hooks/use-returns";
import { resolveReturnSchema, type ResolveReturnInput } from "@/features/order/schemas/return-schema";

const DECISIONS: Array<{ value: ResolveReturnInput["decision"]; title: string; hint: string }> = [
  { value: "refund", title: "Hoàn tiền cho khách", hint: "Tạo yêu cầu hoàn tiền cho kế toán." },
  { value: "reject", title: "Từ chối lần cuối", hint: "Giữ quyết định của shop — khách không khiếu nại lại được." },
];

/*
 * Thân hộp thoại PHÂN XỬ tách riêng + `key` theo yêu cầu: mỗi lần mở là form mới với số tiền mặc định = số hệ thống tính
 * (`calculatedRefundAmount`) — không setState/reset trong useEffect (React Compiler lint set-state-in-effect). Lỗi nghiệp vụ của
 * backend (vd số tiền vượt "tổng đơn − đã hoàn", yêu cầu không còn `escalated`) hiện ngay trong khung này.
 */
function ResolveBody({ request, onClose }: { request: ReturnRequestResponse; onClose: () => void }) {
  const resolve = useResolveReturn(request.id);
  const form = useForm<ResolveReturnInput>({
    resolver: zodResolver(resolveReturnSchema),
    defaultValues: { decision: "refund", note: "", refundAmount: Number(request.calculatedRefundAmount.amount) },
  });
  const errors = form.formState.errors;
  const decision = useWatch({ control: form.control, name: "decision" });
  const refunding = decision === "refund";

  return (
    <>
      <DialogHeader>
        <DialogTitle>Phân xử yêu cầu đổi trả đơn {request.orderCode}</DialogTitle>
        <DialogDescription>
          Xem bằng chứng của cả khách và shop rồi quyết định. Ghi chú được gửi cho cả khách và shop nên cần nêu căn cứ rõ ràng.
        </DialogDescription>
      </DialogHeader>

      <form
        id="return-resolve-form"
        noValidate
        onSubmit={form.handleSubmit((input) =>
          resolve.mutate(
            {
              decision: input.decision,
              note: input.note,
              refundAmount: input.decision === "refund" && input.refundAmount !== undefined ? String(input.refundAmount) : undefined,
            },
            { onSuccess: onClose },
          ),
        )}
      >
        <FieldGroup className="gap-4">
          <div role="radiogroup" aria-label="Quyết định phân xử" className="grid gap-2 sm:grid-cols-2">
            {DECISIONS.map((d) => (
              <label
                key={d.value}
                className={cn(
                  "flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3 text-sm transition-colors has-checked:border-primary/60 has-checked:bg-primary/5",
                  d.value === "reject" && "has-checked:border-red-300 has-checked:bg-red-50 dark:has-checked:bg-red-950/40",
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  <input type="radio" value={d.value} className="accent-primary" {...form.register("decision")} />
                  {d.title}
                </span>
                <span className="text-xs text-muted-foreground">{d.hint}</span>
              </label>
            ))}
          </div>

          {refunding && request.reasonCode === "not_received" ? (
            <p className="rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">
              Khách báo <b>chưa nhận hàng</b>. Nếu đơn là <b>COD</b> đã báo giao: khách chưa từng trả tiền mặt nên &ldquo;hoàn&rdquo; = <b>đảo ghi thu COD</b>, KHÔNG hoàn tiền
              (số tiền bên dưới được bỏ qua) và không cần kế toán chi. Đơn thanh toán online thì hoàn tiền như thường.
            </p>
          ) : null}

          {refunding ? (
            <Field>
              <FieldLabel htmlFor="rs-amount">Số tiền hoàn cho khách (VND)</FieldLabel>
              <Input
                id="rs-amount"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                aria-invalid={!!errors.refundAmount}
                // Ô trống → undefined (không phải NaN) để chuyển sang "từ chối" không bị kẹt lỗi ở ô đã ẩn.
                {...form.register("refundAmount", { setValueAs: (v) => (v === "" || v === null || v === undefined || Number.isNaN(Number(v)) ? undefined : Number(v)) })}
              />
              <p className="text-xs text-muted-foreground">
                Hệ thống tính <b>{request.calculatedRefundAmount.display}</b>
                {request.refundAmount.amount !== request.calculatedRefundAmount.amount ? <>; shop đang đặt <b>{request.refundAmount.display}</b></> : null}. Sàn có thể sửa, tối đa
                bằng tổng đơn trừ phần đã hoàn (hệ thống kiểm tra).
              </p>
              <p className="text-xs text-muted-foreground">
                {request.receivedAt
                  ? "Shop đã xác nhận nhận hàng: hàng sẽ được nhập kho khi hoàn tiền."
                  : "Shop chưa xác nhận nhận hàng: hệ thống KHÔNG nhập kho."}
              </p>
              <FormMessage message={errors.refundAmount?.message} />
            </Field>
          ) : (
            <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
              <p>Từ chối lần cuối là quyết định cuối cùng: khách không khiếu nại lại được và không có khoản nào được hoàn.</p>
            </div>
          )}

          <Field>
            <FieldLabel htmlFor="rs-note">Ghi chú phân xử (bắt buộc)</FieldLabel>
            <Textarea
              id="rs-note"
              rows={3}
              placeholder="Vd: Đã xem ảnh minh chứng của khách và shop: hàng lỗi từ nhà sản xuất, hoàn tiền cho khách."
              aria-invalid={!!errors.note}
              {...form.register("note")}
            />
            <FormMessage message={errors.note?.message} />
          </Field>
        </FieldGroup>
      </form>

      {resolve.error ? <ApiErrorState error={resolve.error} fallback="Phân xử thất bại." compact /> : null}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" form="return-resolve-form" variant={refunding ? "default" : "destructive"} disabled={resolve.isPending}>
          {resolve.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {refunding ? "Hoàn tiền cho khách" : "Từ chối lần cuối"}
        </Button>
      </DialogFooter>
    </>
  );
}

/* Sàn phân xử yêu cầu đổi trả đã chuyển lên (`escalated`): hoàn tiền (số tiền sửa được) hoặc từ chối lần cuối — ghi chú bắt buộc. */
export function ReturnResolveDialog({
  request,
  open,
  onOpenChange,
}: {
  request: ReturnRequestResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <ResolveBody key={request.id} request={request} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
