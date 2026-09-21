"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useConfirmTransfer } from "@/features/payment/hooks/use-payments";
import type { PaymentResponse } from "@/features/payment/types/payment";

/*
 * Kế toán đối soát chuyển khoản: nhập mã giao dịch ngân hàng (tuỳ chọn) +
 * ghi chú → giao dịch paid, đơn được xác nhận. Form nhỏ, không cần Zod.
 */
export function ConfirmTransferDialog({ payment, onClose }: { payment: PaymentResponse | null; onClose: () => void }) {
  return (
    <Dialog open={!!payment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {/* key theo id: mỗi giao dịch mở ra là form mới, không cần effect reset. */}
        {payment ? <ConfirmTransferBody key={payment.id} payment={payment} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ConfirmTransferBody({ payment, onClose }: { payment: PaymentResponse; onClose: () => void }) {
  const confirm = useConfirmTransfer(payment.id);
  const [bankRef, setBankRef] = useState("");
  const [note, setNote] = useState("");

  return (
    <>
      <DialogHeader>
        <DialogTitle>Xác nhận đã nhận chuyển khoản</DialogTitle>
        <DialogDescription>
          Đơn <b>{payment.orderCode}</b> · {payment.amount.display} · nội dung CK{" "}
          <code className="font-mono">{payment.transferContent ?? "—"}</code>
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="ct-ref">Mã giao dịch ngân hàng (tuỳ chọn)</FieldLabel>
          <Input id="ct-ref" placeholder="FT26091512345" value={bankRef} onChange={(e) => setBankRef(e.target.value)} maxLength={120} />
        </Field>
        <Field>
          <FieldLabel htmlFor="ct-note">Ghi chú</FieldLabel>
          <Input id="ct-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button
          disabled={confirm.isPending}
          onClick={() => confirm.mutate({ bankRef: bankRef || undefined, note: note || undefined }, { onSuccess: onClose })}
        >
          {confirm.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Xác nhận đã nhận tiền
        </Button>
      </DialogFooter>
    </>
  );
}
