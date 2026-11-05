"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/shared/form-message";
import { apiErrorCode, apiStatus } from "@/lib/api-error";
import { formatVnd } from "@/lib/format";
import { useCreateTopup } from "@/features/shop/hooks/use-wallet-topups";

/* Gợi ý số tiền nhanh; chỉ hiện các mức nằm trong [tối thiểu, tối đa] mà backend trả. */
const SUGGESTIONS = [500_000, 1_000_000, 2_000_000, 5_000_000];

/*
 * Lời hướng dẫn ngay trong hộp thoại theo mã lỗi nghiệp vụ (PLAN-0041 §5.4). Toast lỗi đã do useCreateTopup lo, nên ở đây chỉ
 * nói người dùng cần làm gì tiếp (thử lại, chờ, hoặc liên hệ sàn khi nạp đang tạm đóng).
 */
function hintFor(error: unknown): string | null {
  switch (apiErrorCode(error)) {
    case "WALLET_TOPUP_DISABLED":
    case "WALLET_TOPUP_UNAVAILABLE":
      return "Nạp tiền vào ví đang tạm thời không khả dụng. Vui lòng liên hệ sàn.";
    case "WALLET_TOPUP_LINK_FAILED":
      return "Chưa tạo được trang thanh toán lúc này. Thử lại sau ít phút.";
    case "WALLET_TOPUP_IN_PROGRESS":
      return "Yêu cầu trước đang được xử lý. Thử lại sau vài giây.";
    default:
      return apiStatus(error) === 429 ? "Bạn thao tác quá nhiều lần. Vui lòng thử lại sau ít phút." : null;
  }
}

/*
 * Nhập số tiền rồi chuyển sang trang thanh toán PayOS. Tạo link thành công thì chuyển thẳng trong cùng tab: PayOS sẽ đưa khách
 * quay về trang kết quả của ví. Số tiền chỉ là chữ số.
 */
export function TopupDialog({ minAmount, maxAmount, onClose }: { minAmount: number; maxAmount: number; onClose: () => void }) {
  const create = useCreateTopup();
  const schema = useMemo(
    () =>
      z.object({
        amount: z
          .string()
          .regex(/^[1-9]\d{0,13}$/, "Nhập số tiền (chỉ chữ số)")
          .refine((v) => Number(v) >= minAmount, `Tối thiểu ${formatVnd(minAmount)}`)
          .refine((v) => Number(v) <= maxAmount, `Tối đa ${formatVnd(maxAmount)} mỗi lần`),
      }),
    [minAmount, maxAmount],
  );
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { amount: "" } });
  const errors = form.formState.errors;
  const suggestions = SUGGESTIONS.filter((v) => v >= minAmount && v <= maxAmount);
  // Đã tạo link thành công thì giữ nút khoá tới lúc trình duyệt rời trang, tránh bấm lần hai.
  const busy = create.isPending || create.isSuccess;
  const hint = create.isError ? hintFor(create.error) : null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nạp tiền vào ví đặt cọc</DialogTitle>
          <DialogDescription>
            Bạn sẽ được chuyển tới trang thanh toán (quét QR / chuyển khoản ngân hàng). Ví được cộng ngay khi nhận được tiền, không cần chờ sàn duyệt.
          </DialogDescription>
        </DialogHeader>
        <form
          id="topup-form"
          noValidate
          onSubmit={form.handleSubmit((v) =>
            create.mutate(v.amount, {
              onSuccess: (r) => {
                if (!r.checkoutUrl) {
                  onClose();
                  return;
                }
                // Link còn hạn của khoản cũ: vẫn đưa khách tới đúng link đó để không tạo thêm khoản mở.
                if (r.reused) toast.info("Bạn đang có một lần nạp còn hiệu lực — chuyển tới trang thanh toán của lần đó.");
                window.location.assign(r.checkoutUrl);
              },
            }),
          )}
        >
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="topup-amount">Số tiền muốn nạp (VND)</FieldLabel>
              <Input
                id="topup-amount"
                inputMode="numeric"
                placeholder="2000000"
                aria-invalid={!!errors.amount}
                {...form.register("amount", { setValueAs: (v: string) => v.replace(/\D/g, "") })}
              />
              <p className="text-xs text-muted-foreground">
                Tối thiểu {formatVnd(minAmount)} · tối đa {formatVnd(maxAmount)} mỗi lần
              </p>
              <FormMessage message={errors.amount?.message} />
            </Field>
            {suggestions.length ? (
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((v) => (
                  <Button
                    key={v}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => form.setValue("amount", String(v), { shouldValidate: true })}
                  >
                    {formatVnd(v)}
                  </Button>
                ))}
              </div>
            ) : null}
            {hint ? (
              <p role="alert" className="text-sm text-destructive">
                {hint}
              </p>
            ) : null}
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button type="submit" form="topup-form" disabled={busy}>
            {busy ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Tiếp tục thanh toán
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
