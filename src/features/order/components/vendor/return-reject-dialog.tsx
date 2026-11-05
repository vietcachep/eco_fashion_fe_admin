"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FormMessage } from "@/components/shared/form-message";
import type { MediaItemInput, ShopReturnRequestResponse } from "@/lib/api/generated/model";
import { ReturnEvidencePicker } from "@/features/order/components/returns-common/return-evidence-picker";
import { useRejectReturn } from "@/features/order/hooks/use-shop-returns";
import { rejectReturnSchema, type RejectReturnInput } from "@/features/order/schemas/return-schema";

/* Thân tách riêng + `key` theo yêu cầu: mỗi lần mở là form trống mới, ảnh minh chứng cũng làm lại từ đầu. */
function RejectBody({ request, onClose }: { request: ShopReturnRequestResponse; onClose: () => void }) {
  const reject = useRejectReturn(request.id);
  const [evidence, setEvidence] = useState<MediaItemInput[]>([]);
  const form = useForm<RejectReturnInput>({ resolver: zodResolver(rejectReturnSchema), defaultValues: { reason: "" } });
  const errors = form.formState.errors;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Từ chối yêu cầu đổi trả đơn {request.orderCode}</DialogTitle>
        <DialogDescription>
          Khách đọc được lý do của bạn và có thể khiếu nại lên sàn trong thời hạn quy định. Lý do rõ ràng cùng ảnh minh chứng là căn cứ để sàn phân xử.
        </DialogDescription>
      </DialogHeader>

      <form
        id="return-reject-form"
        noValidate
        onSubmit={form.handleSubmit((input) =>
          reject.mutate({ reason: input.reason, evidence: evidence.length ? evidence : undefined }, { onSuccess: onClose }),
        )}
      >
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="rr-reason">Lý do từ chối</FieldLabel>
            <Textarea id="rr-reason" rows={4} placeholder="Vd: Hàng đã qua sử dụng, tem mác bị cắt — không đúng điều kiện đổi trả." aria-invalid={!!errors.reason} {...form.register("reason")} />
            <FormMessage message={errors.reason?.message} />
          </Field>
          <Field>
            <FieldLabel>Ảnh minh chứng (tuỳ chọn)</FieldLabel>
            <ReturnEvidencePicker value={evidence} onChange={setEvidence} />
          </Field>
        </FieldGroup>
      </form>

      {reject.error ? <ApiErrorState error={reject.error} fallback="Từ chối yêu cầu thất bại." compact /> : null}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" form="return-reject-form" variant="destructive" disabled={reject.isPending}>
          {reject.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Từ chối yêu cầu
        </Button>
      </DialogFooter>
    </>
  );
}

/* Shop từ chối yêu cầu đổi trả: lý do ≥ 10 ký tự + ảnh minh chứng tuỳ chọn. */
export function ReturnRejectDialog({
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
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <RejectBody key={request.id} request={request} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
