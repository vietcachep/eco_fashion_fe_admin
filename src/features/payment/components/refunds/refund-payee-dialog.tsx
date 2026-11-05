"use client";

import { CopyIcon, ShieldAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { DetailList } from "@/components/shared/detail-list";
import type { RefundPayeeRevealResponse, RefundResponse } from "@/lib/api/generated/model";
import { REFUND_PAYEE_SOURCE_LABEL } from "@/lib/labels";
import { bankNameByBin } from "@/features/shop/types/bank-list";

const LOAD_ERROR = "Không xem được số tài khoản nhận hoàn.";

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Đã sao chép số tài khoản.");
  } catch {
    toast.error("Không sao chép được — hãy chọn và sao chép thủ công.");
  }
}

/*
 * Hộp thoại xem SỐ TÀI KHOẢN ĐẦY ĐỦ nhận hoàn. Số TK chỉ tồn tại trong `payee` do màn cha giữ bằng mutation (gcTime 0) và bị xoá khi
 * đóng (màn cha gọi `reset()`): không đưa vào URL, không lưu state lâu, không log. Mỗi lần mở là một lần gọi riêng — backend ghi audit
 * (không ghi số). Chỉ gọi được khi khoản hoàn còn mở; đã hoàn xong ⇒ 409 hiện ngay trong khung.
 */
export function RefundPayeeDialog({
  refund,
  payee,
  isPending,
  error,
  onClose,
}: {
  refund: RefundResponse | null;
  payee: RefundPayeeRevealResponse | undefined;
  isPending: boolean;
  error: unknown;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!refund} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tài khoản nhận hoàn — đơn {refund?.orderCode}</DialogTitle>
          <DialogDescription>Dùng để chuyển khoản tay {refund?.amount.display}. Sau khi chuyển, quay lại &quot;Hoàn tiền&quot; để nhập mã giao dịch.</DialogDescription>
        </DialogHeader>

        <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <ShieldAlertIcon className="mt-0.5 size-4 shrink-0" />
          Thông tin nhạy cảm — mỗi lần xem đều được ghi nhật ký. Hộp thoại này không lưu lại số tài khoản sau khi đóng.
        </p>

        {error ? (
          <ApiErrorState error={error} fallback={LOAD_ERROR} compact />
        ) : isPending || !payee ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-5 w-56" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
              <span className="font-mono text-lg font-semibold tracking-wide break-all">{payee.accountNumber}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => void copy(payee.accountNumber)}>
                <CopyIcon className="size-3.5" />
                Sao chép
              </Button>
            </div>
            <DetailList
              rows={[
                { label: "Chủ tài khoản", value: payee.accountName || "—" },
                { label: "Ngân hàng", value: payee.bankName || bankNameByBin(payee.bankBin) || `BIN ${payee.bankBin}` },
                { label: "Nguồn", value: REFUND_PAYEE_SOURCE_LABEL[payee.source] ?? payee.source },
                { label: "Số tiền cần chuyển", value: refund?.amount.display },
              ]}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
