"use client";

import { useForm, useWatch } from "react-hook-form";
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/shared/form-message";
import { formatVnd } from "@/lib/format";
import { useAdjustShopWallet } from "@/features/shop/hooks/use-admin-wallets";
import { walletAdjustSchema, type WalletAdjustInput } from "@/features/shop/schemas/wallet-adjust-schema";

/* Hậu quả của số dư mới lên COD — luật backend: ví ≤ 0 ⇒ khoá COD, ví > 0 ⇒ mở. */
function codOutcome(before: number, after: number): string {
  if (after <= 0) return before > 0 ? "COD của shop sẽ bị KHOÁ ngay." : "COD của shop vẫn bị khoá.";
  return before <= 0 ? "COD của shop sẽ được MỞ LẠI." : "COD của shop giữ nguyên (đang bật).";
}

/*
 * Điều chỉnh ví quỹ COD của shop (POST /admin/shops/:id/wallet/adjust): số tiền dương = cộng,
 * âm = trừ, bắt buộc ghi chú ≥ 5 ký tự (vào sổ cái + nhật ký). Dòng xem trước số dư mới cho
 * nhân viên thấy ngay COD sẽ khoá/mở trước khi bấm lưu.
 */
export function WalletAdjustDialog({
  shopId,
  shopName,
  balance,
  onClose,
}: {
  shopId: string;
  shopName: string;
  /** Số dư hiện tại (chuỗi VND từ backend). */
  balance: string;
  onClose: () => void;
}) {
  const adjust = useAdjustShopWallet(shopId);
  const form = useForm<WalletAdjustInput>({ resolver: zodResolver(walletAdjustSchema), defaultValues: { note: "" } });
  const errors = form.formState.errors;
  const amount = useWatch({ control: form.control, name: "amount" });

  const before = Number(balance);
  const validAmount = typeof amount === "number" && Number.isFinite(amount) && amount !== 0;
  const after = validAmount ? before + amount : null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Điều chỉnh ví — {shopName}</DialogTitle>
          <DialogDescription>Số dư hiện tại: {formatVnd(balance)}</DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <p>
            Điều chỉnh đổi số dư quỹ COD và có thể khoá/mở COD của shop ngay lập tức. Lý do được ghi vào sổ cái và nhật ký, không sửa
            được sau khi lưu.
          </p>
        </div>
        <form
          id="wallet-adjust-form"
          noValidate
          onSubmit={form.handleSubmit((input) => adjust.mutate({ amount: input.amount, note: input.note }, { onSuccess: onClose }))}
        >
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="wallet-amount">Số tiền (VND)</FieldLabel>
              <Input
                id="wallet-amount"
                type="number"
                inputMode="numeric"
                step={1}
                placeholder="100000 hoặc -50000"
                aria-invalid={!!errors.amount}
                {...form.register("amount", { valueAsNumber: true })}
              />
              <FieldDescription>Số dương để cộng vào ví, số âm để trừ khỏi ví.</FieldDescription>
              <FormMessage message={errors.amount?.message} />
              {after !== null ? (
                <p className="text-sm">
                  Số dư sau điều chỉnh: <span className={after <= 0 ? "font-semibold text-destructive" : "font-semibold"}>{formatVnd(after)}</span>
                  {" — "}
                  {codOutcome(before, after)}
                </p>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="wallet-note">Ghi chú / lý do</FieldLabel>
              <Textarea id="wallet-note" rows={3} placeholder="Điều chỉnh do khiếu nại hoàn tiền #123…" aria-invalid={!!errors.note} {...form.register("note")} />
              <FormMessage message={errors.note?.message} />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" form="wallet-adjust-form" disabled={adjust.isPending}>
            {adjust.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Điều chỉnh ví
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
