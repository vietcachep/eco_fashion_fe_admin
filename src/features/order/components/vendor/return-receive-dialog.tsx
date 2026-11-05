"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FormMessage } from "@/components/shared/form-message";
import type { MediaItemInput, ShopReturnRequestResponse } from "@/lib/api/generated/model";
import { cn } from "@/lib/utils";
import { ReturnEvidencePicker } from "@/features/order/components/returns-common/return-evidence-picker";
import { useReceiveReturn } from "@/features/order/hooks/use-shop-returns";
import { receiveReturnSchema, type ReceiveReturnInput } from "@/features/order/schemas/return-schema";

const CONDITIONS: Array<{ value: ReceiveReturnInput["condition"]; title: string; hint: string }> = [
  { value: "ok", title: "Đúng hàng", hint: "Hàng khớp yêu cầu — nhập kho và hoàn tiền cho khách." },
  { value: "not_matching", title: "Không khớp", hint: "Hàng khác / thiếu / hỏng so với yêu cầu — chuyển sàn phân xử." },
];

/* Thân tách riêng + `key` theo yêu cầu: mỗi lần mở là form mới (không setState/reset trong useEffect). */
function ReceiveBody({ request, onClose }: { request: ShopReturnRequestResponse; onClose: () => void }) {
  const receive = useReceiveReturn(request.id);
  const [evidence, setEvidence] = useState<MediaItemInput[]>([]);
  const form = useForm<ReceiveReturnInput>({ resolver: zodResolver(receiveReturnSchema), defaultValues: { condition: "ok", note: "" } });
  const errors = form.formState.errors;
  const condition = useWatch({ control: form.control, name: "condition" });
  const mismatch = condition === "not_matching";

  return (
    <>
      <DialogHeader>
        <DialogTitle>Xác nhận đã nhận hàng trả — đơn {request.orderCode}</DialogTitle>
        <DialogDescription>Kiểm tra hàng khách gửi về rồi chọn kết quả. Mọi lựa chọn được ghi lại cùng ảnh minh chứng của bạn.</DialogDescription>
      </DialogHeader>

      <form
        id="return-receive-form"
        noValidate
        onSubmit={form.handleSubmit((input) =>
          receive.mutate(
            { condition: input.condition, note: input.note || undefined, evidence: evidence.length ? evidence : undefined },
            { onSuccess: onClose },
          ),
        )}
      >
        <FieldGroup className="gap-4">
          <div role="radiogroup" aria-label="Kết quả kiểm hàng" className="grid gap-2 sm:grid-cols-2">
            {CONDITIONS.map((c) => (
              <label
                key={c.value}
                className={cn(
                  "flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3 text-sm transition-colors has-checked:border-primary/60 has-checked:bg-primary/5",
                  c.value === "not_matching" && "has-checked:border-amber-400 has-checked:bg-amber-50 dark:has-checked:bg-amber-950/40",
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  <input type="radio" value={c.value} className="accent-primary" {...form.register("condition")} />
                  {c.title}
                </span>
                <span className="text-xs text-muted-foreground">{c.hint}</span>
              </label>
            ))}
          </div>

          {mismatch ? (
            <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
              <p>
                Yêu cầu sẽ <b>chuyển lên sàn phân xử</b>: hàng chưa được nhập kho và khách chưa được hoàn tiền cho tới khi sàn quyết định.
                Hãy mô tả rõ điểm khác biệt và đính kèm ảnh để sàn xử lý đúng.
              </p>
            </div>
          ) : null}

          <Field>
            <FieldLabel htmlFor="rv-note">{mismatch ? "Mô tả điểm không khớp" : "Ghi chú (tuỳ chọn)"}</FieldLabel>
            <Textarea
              id="rv-note"
              rows={3}
              placeholder={mismatch ? "Vd: Khách gửi về áo khác mẫu, thiếu phụ kiện đi kèm…" : "Tình trạng hàng khi nhận"}
              aria-invalid={!!errors.note}
              {...form.register("note")}
            />
            <FormMessage message={errors.note?.message} />
          </Field>
          <Field>
            <FieldLabel>Ảnh kiểm hàng (tuỳ chọn)</FieldLabel>
            <ReturnEvidencePicker value={evidence} onChange={setEvidence} />
          </Field>
        </FieldGroup>
      </form>

      {receive.error ? <ApiErrorState error={receive.error} fallback="Xác nhận nhận hàng thất bại." compact /> : null}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" form="return-receive-form" variant={mismatch ? "destructive" : "default"} disabled={receive.isPending}>
          {receive.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {mismatch ? "Báo hàng không khớp" : "Xác nhận đã nhận hàng"}
        </Button>
      </DialogFooter>
    </>
  );
}

/* Shop xác nhận ĐÃ NHẬN lại hàng: đúng hàng ⇒ nhập kho + hoàn tiền; không khớp ⇒ chuyển sàn phân xử. */
export function ReturnReceiveDialog({
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
        <ReceiveBody key={request.id} request={request} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
