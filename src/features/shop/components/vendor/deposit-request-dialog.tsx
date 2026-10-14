"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BanknoteArrowUpIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FilePicker } from "@/components/shared/file-picker";
import { FormMessage } from "@/components/shared/form-message";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PERMISSIONS } from "@/lib/constants";
import { formatVnd } from "@/lib/format";
import { useUploadMedia } from "@/features/shop/hooks/use-media-upload";
import { usePlatformContact } from "@/features/shop/hooks/use-platform-contact";
import { useCreateDepositRequest } from "@/features/shop/hooks/use-shop-wallet";
import { shopDepositSchema, type ShopDepositInput } from "@/features/shop/schemas/shop-deposit-schema";

const QUICK_AMOUNTS = [100_000, 500_000, 1_000_000, 5_000_000] as const;

/*
 * Nút "Nộp thêm quỹ" + popup (POST /shop/wallet/deposit-requests). Luồng ngoài đời: shop chuyển khoản cho sàn rồi gửi
 * yêu cầu kèm ảnh chứng từ; nhân viên sàn đối chiếu và duyệt thì ví được cộng. Backend chỉ cho MỘT yêu cầu chờ duyệt
 * mỗi lúc nên nút khoá khi `disabled` (đang có yêu cầu pending).
 */
export function DepositRequestButton({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <PermissionGate permission={PERMISSIONS.shopWalletDepositRequest}>
      <Button onClick={() => setOpen(true)} disabled={disabled} title={disabled ? "Đang có một yêu cầu nộp quỹ chờ duyệt" : undefined}>
        <BanknoteArrowUpIcon className="size-4" />
        Nộp thêm quỹ
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          {open ? <DepositBody onClose={() => setOpen(false)} /> : null}
        </DialogContent>
      </Dialog>
    </PermissionGate>
  );
}

/* Thân dialog mount mới mỗi lần mở → form + file chứng từ tự sạch. */
function DepositBody({ onClose }: { onClose: () => void }) {
  const create = useCreateDepositRequest();
  const upload = useUploadMedia();
  const contact = usePlatformContact();
  const [proof, setProof] = useState<File | null>(null);
  const form = useForm<ShopDepositInput>({
    resolver: zodResolver(shopDepositSchema),
    defaultValues: { amount: 500_000, note: "" },
  });
  const errors = form.formState.errors;
  const amount = useWatch({ control: form.control, name: "amount" });
  const pending = upload.isPending || create.isPending;

  /* Ảnh chứng từ lên Cloudinary trước (cần URL) rồi mới gửi yêu cầu; tải ảnh lỗi thì dừng, toast do hook upload lo. */
  const submit = form.handleSubmit(async (input) => {
    let proofUrl: string | undefined;
    try {
      if (proof) proofUrl = (await upload.mutateAsync(proof)).url;
    } catch {
      return;
    }
    create.mutate({ amount: input.amount, proofUrl, note: input.note || undefined }, { onSuccess: onClose });
  });

  const hotline = contact.data?.hotline;
  const email = contact.data?.email;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nộp thêm quỹ COD</DialogTitle>
        <DialogDescription>
          Chuyển khoản vào tài khoản nhận quỹ của sàn, rồi gửi yêu cầu kèm ảnh chứng từ. Sàn duyệt xong, số tiền được cộng vào ví và COD mở lại khi ví lớn hơn 0.
        </DialogDescription>
      </DialogHeader>
      <div className="rounded-lg border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
        Thông tin tài khoản nhận quỹ của sàn do bộ phận hỗ trợ nhà cung cấp cung cấp khi bạn liên hệ
        {hotline || email ? (
          <>
            {" "}
            qua {hotline ? <b className="text-foreground">hotline {hotline}</b> : null}
            {hotline && email ? " hoặc " : null}
            {email ? <b className="text-foreground">{email}</b> : null}
          </>
        ) : null}
        .
      </div>
      <form id="deposit-request-form" noValidate onSubmit={submit}>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="deposit-amount">Số tiền nộp (VND)</FieldLabel>
            <Input
              id="deposit-amount"
              type="number"
              inputMode="numeric"
              min={10_000}
              step={1000}
              aria-invalid={!!errors.amount}
              {...form.register("amount", { valueAsNumber: true })}
            />
            <FormMessage message={errors.amount?.message} />
            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_AMOUNTS.map((v) => (
                <Button
                  key={v}
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => form.setValue("amount", v, { shouldValidate: true })}
                >
                  {formatVnd(v)}
                </Button>
              ))}
              {Number.isFinite(amount) ? <span className="ml-auto text-xs text-muted-foreground">= {formatVnd(amount)}</span> : null}
            </div>
          </Field>
          <Field>
            <FieldLabel>Ảnh chứng từ chuyển khoản</FieldLabel>
            <FilePicker file={proof} onChange={setProof} onError={(m) => toast.error(m)} label={proof ? "Đổi ảnh" : "Chọn ảnh"} previewClassName="size-20" />
            <p className="text-xs text-muted-foreground">Không bắt buộc, nhưng đính kèm giúp sàn đối chiếu và duyệt nhanh hơn.</p>
          </Field>
          <Field>
            <FieldLabel htmlFor="deposit-note">Ghi chú</FieldLabel>
            <Textarea id="deposit-note" rows={2} placeholder="Ví dụ: Nộp quỹ để mở lại COD" aria-invalid={!!errors.note} {...form.register("note")} />
            <FormMessage message={errors.note?.message} />
          </Field>
        </FieldGroup>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Hủy
        </Button>
        <Button type="submit" form="deposit-request-form" disabled={pending}>
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Gửi yêu cầu
        </Button>
      </DialogFooter>
    </>
  );
}
