"use client";

import { useState } from "react";
import { Loader2Icon, SearchCheckIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FormMessage } from "@/components/shared/form-message";
import type { RefundResponse } from "@/lib/api/generated/model";
import { REFUND_PAYEE_SOURCE_LABEL } from "@/lib/labels";
import {
  isRefundReconcileRequired,
  processRefundErrorMessage,
  useCheckGatewayRefund,
  useProcessRefund,
} from "@/features/payment/hooks/use-payments";

/*
 * Mã giao dịch hoàn tay: backend 4–120 ký tự chữ-số và `. _ : / # -`, duy nhất toàn hệ thống, KHÔNG mở đầu bằng `payos-refund:` (tiền tố của
 * mã hệ thống tự ghi). Kiểm ở đây để báo sớm đúng ô; trùng với khoản khác thì chỉ backend biết (409 REFUND_PROVIDER_REF_DUPLICATE).
 */
const PROVIDER_REF_PATTERN = /^[A-Za-z0-9._:/#-]{4,120}$/;
const SYSTEM_PREFIX = "payos-refund:";

function providerRefError(value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  if (v.toLowerCase().startsWith(SYSTEM_PREFIX)) return "Không dùng tiền tố payos-refund: (dành cho mã hệ thống tự ghi).";
  if (!PROVIDER_REF_PATTERN.test(v)) return "Mã giao dịch 4–120 ký tự, chỉ gồm chữ, số và . _ : / # -";
  return undefined;
}

/* Thân tách riêng + `key` theo khoản hoàn: mỗi lần mở là form mới (không setState/reset trong useEffect). Lỗi backend hiện ngay trong khung. */
function ProcessRefundBody({ refund, onClose }: { refund: RefundResponse; onClose: () => void }) {
  const process = useProcessRefund(refund.id);
  const reconcile = useCheckGatewayRefund();
  const [providerRef, setProviderRef] = useState("");
  const [note, setNote] = useState("");
  // Hiện ô xác nhận "lệnh PayOS CHƯA chạy" CHỈ sau khi backend từ chối (409 PAYMENT_REFUND_RECONCILE_REQUIRED) — mặc định đường an toàn là đối soát.
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [confirmNotExecuted, setConfirmNotExecuted] = useState(false);
  // Chuyển khoản tay khi backend không tự chi được (thiếu TK nhận / chưa cấu hình payout / PayOS treo) — phải nhập mã giao dịch; còn lại hệ thống gọi PayOS.
  const manual = refund.needsManual || refund.needsReconcile;
  const duplicate = refund.kind === "duplicate_payment";
  const mismatch = refund.kind === "mismatch";
  const refError = manual ? providerRefError(providerRef) : undefined;
  const canSubmit = !process.isPending && (!manual || (!!providerRef.trim() && !refError)) && (!needsConfirm || confirmNotExecuted);

  const submit = () =>
    process.mutate(
      {
        providerRef: manual ? providerRef.trim() : undefined,
        note: note.trim() || undefined,
        confirmGatewayNotExecuted: needsConfirm && confirmNotExecuted ? true : undefined,
      },
      {
        onSuccess: onClose,
        onError: (e) => {
          if (isRefundReconcileRequired(e)) setNeedsConfirm(true);
        },
      },
    );

  // Đối soát: xử lý KHÔNG kèm mã để backend tra / chạy lại đúng lệnh PayOS đã gửi. Xong (dù kết quả nào) thì đóng — danh sách đã được làm mới.
  const doReconcile = () => reconcile.mutate(refund.id, { onSuccess: onClose });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{refund.needsReconcile ? "Chuyển tay khoản hoàn — " : "Hoàn tiền đơn "}{refund.orderCode}</DialogTitle>
        <DialogDescription>
          {refund.amount.display}.{" "}
          {manual ? (
            <>
              Chuyển khoản tay cho khách rồi nhập mã giao dịch để ghi sổ. Cần số tài khoản đầy đủ thì đóng hộp thoại này và bấm &quot;Xem số TK&quot; ở dòng hoàn tiền.
            </>
          ) : (
            <>
              Hệ thống gửi lệnh chi qua PayOS{refund.payee ? ` tới tài khoản ${refund.payee.accountNumberMasked} (${REFUND_PAYEE_SOURCE_LABEL[refund.payeeSource] ?? refund.payeeSource})` : ""}.
              PayOS cần một lúc để xác nhận — khoản chỉ chuyển &quot;Đã hoàn&quot; khi PayOS báo chuyển thành công.
            </>
          )}
          {duplicate ? " Đây là khoản khách trả trùng: đơn vẫn giữ trạng thái đã thanh toán." : ""}
          {mismatch ? " Đây là phần tiền thanh toán lệch (trả thừa / trả thiếu rồi đơn huỷ): không đổi trạng thái thanh toán của đơn." : ""}
        </DialogDescription>
      </DialogHeader>

      {refund.needsReconcile ? (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p className="flex items-start gap-2">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
            <span>
              Lệnh chi PayOS của khoản này <strong>không rõ kết quả</strong> — PayOS có thể đã chuyển tiền; chuyển tay bây giờ có thể khiến khách nhận hai lần. Cách an toàn: đối soát theo lệnh PayOS đã gửi (không nhập mã giao dịch).
            </span>
          </p>
          <div>
            <Button size="sm" variant="outline" disabled={reconcile.isPending || process.isPending} onClick={doReconcile}>
              {reconcile.isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : <SearchCheckIcon className="size-3.5" />}
              Đối soát theo lệnh PayOS
            </Button>
          </div>
        </div>
      ) : null}

      <FieldGroup className="gap-4">
        {manual ? (
          <Field>
            <FieldLabel htmlFor="rf-ref">Mã giao dịch chuyển khoản</FieldLabel>
            <Input
              id="rf-ref"
              placeholder="FT26091512345"
              autoComplete="off"
              value={providerRef}
              onChange={(e) => setProviderRef(e.target.value)}
              maxLength={120}
              aria-invalid={!!refError}
            />
            <p className="text-xs text-muted-foreground">Mã này duy nhất toàn hệ thống — không dùng lại mã của khoản hoàn khác.</p>
            <FormMessage message={refError} />
          </Field>
        ) : null}
        {needsConfirm ? (
          <Field orientation="horizontal" className="items-start">
            <Checkbox id="rf-confirm" className="mt-0.5" checked={confirmNotExecuted} onCheckedChange={(on) => setConfirmNotExecuted(on === true)} />
            <FieldLabel htmlFor="rf-confirm" className="flex-col items-start gap-0.5 font-normal">
              <span className="font-medium">Đã đối chiếu bảng điều khiển PayOS: lệnh hoàn này CHƯA chạy</span>
              <span className="text-xs text-muted-foreground">Chỉ tick khi chắc chắn — nếu PayOS đã nhận lệnh thì backend vẫn từ chối và bạn phải đối soát theo lệnh PayOS.</span>
            </FieldLabel>
          </Field>
        ) : null}
        <Field>
          <FieldLabel htmlFor="rf-note">Ghi chú</FieldLabel>
          <Input id="rf-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </Field>
      </FieldGroup>

      {/* Câu lỗi đã chọn sẵn (mã trùng nói riêng, 409 đối soát dùng câu của backend) nên đưa vào `fallback` — vẫn dùng khung lỗi chuẩn. */}
      {process.error ? <ApiErrorState error={null} fallback={processRefundErrorMessage(process.error, "Hoàn tiền thất bại.")} compact /> : null}
      {process.error && isRefundReconcileRequired(process.error) ? (
        <div className="flex flex-col items-start gap-2 text-xs text-muted-foreground">
          <p>
            Nếu PayOS ĐÃ nhận lệnh: đừng chuyển tay — bấm &quot;Đối soát theo lệnh PayOS&quot;. Nếu hệ thống chỉ không tra được PayOS: đối chiếu bảng điều khiển PayOS, và chỉ khi lệnh CHƯA chạy mới tick ô xác nhận phía trên
            rồi ghi nhận lại.
          </p>
          {!refund.needsReconcile ? (
            <Button size="sm" variant="outline" disabled={reconcile.isPending} onClick={doReconcile}>
              {reconcile.isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : <SearchCheckIcon className="size-3.5" />}
              Đối soát theo lệnh PayOS
            </Button>
          ) : null}
        </div>
      ) : null}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button disabled={!canSubmit} onClick={submit}>
          {process.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {manual ? "Ghi nhận đã chuyển" : "Gửi lệnh hoàn tiền"}
        </Button>
      </DialogFooter>
    </>
  );
}

/* Kế toán xử lý một khoản hoàn: PayOS tự chi hoặc ghi nhận chuyển khoản tay kèm mã giao dịch (quyền `payment.refund.process`). */
export function ProcessRefundDialog({ refund, onClose }: { refund: RefundResponse | null; onClose: () => void }) {
  return (
    <Dialog open={!!refund} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">{refund ? <ProcessRefundBody key={refund.id} refund={refund} onClose={onClose} /> : null}</DialogContent>
    </Dialog>
  );
}
