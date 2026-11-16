"use client";

import { useState } from "react";
import { Loader2Icon, SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { NativeSelect } from "@/components/shared/native-select";
import { formatVnd } from "@/lib/format";
import { bankNameByBin, VN_BANKS } from "@/features/shop/types/bank-list";
import { testTransferErrorMessage, useCheckTestTransfer, useTestTransfer, useTestTransferConfig } from "@/features/shop/hooks/use-payout-test-transfer";

const LOAD_ERROR = "Không tải được cấu hình thử chi.";
const OUTCOME_TEXT = {
  submitted: "PayOS đã NHẬN lệnh chuyển tiền. Bấm “Kiểm tra trạng thái” để biết tiền đã về chưa.",
  failed: "PayOS TỪ CHỐI lệnh (chắc chắn chưa chuyển tiền).",
  unknown: "Chưa rõ kết quả — tiền CÓ THỂ đã đi. Hãy kiểm tra trạng thái và KHÔNG gửi lại cho tới khi biết.",
} as const;
const STATE_TEXT = { succeeded: "Đã chuyển thành công", failed: "Chuyển thất bại", processing: "PayOS đang xử lý", unknown: "Chưa rõ" } as const;

/*
 * THỬ CHI TỰ ĐỘNG: nhập ngân hàng + số tài khoản + số tiền rồi gửi lệnh chuyển TIỀN THẬT từ tài khoản chi PayOS — cách trực tiếp để kiểm tra
 * khoá chi, quỹ chi và luồng gửi lệnh mà không cần đơn/shop. Chỉ hiện form khi sàn bật tham số `payout.test_enabled` (mặc định TẮT; bật để thử
 * rồi tắt lại). Mỗi lần bấm dùng một `clientKey` làm khoá idempotency — bấm đúp không chuyển hai lần; sau mỗi lần gửi khoá được đổi mới.
 */
export function PayoutTestCard() {
  const config = useTestTransferConfig();
  const send = useTestTransfer();
  const check = useCheckTestTransfer();
  const [bankCode, setBankCode] = useState("970422");
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [clientKey, setClientKey] = useState(() => crypto.randomUUID());

  if (config.isError) return <ApiErrorState error={config.error} fallback={LOAD_ERROR} compact />;
  if (config.isLoading || !config.data) return <Skeleton className="h-40 w-full rounded-xl" />;
  const c = config.data;
  const amountNum = Number(amount);
  const valid = /^\d{6,20}$/.test(accountNumber) && Number.isInteger(amountNum) && amountNum >= 1000 && amountNum <= c.maxAmount;
  const popular = VN_BANKS.filter((b) => b.popular);
  const others = VN_BANKS.filter((b) => !b.popular);
  const result = send.data;

  const submit = () => {
    setConfirming(false);
    send.mutate({ bankCode, accountNumber, amount: amountNum, clientKey, ...(note.trim() ? { note: note.trim() } : {}) });
    setClientKey(crypto.randomUUID());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <SendIcon className="size-4 text-muted-foreground" />
          Thử chi tự động (PayOS) — chuyển tiền thật
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!c.enabled ? (
          <p className="text-sm text-muted-foreground">
            Công cụ đang <b>tắt</b>. Để thử, vào Cài đặt → Tham số vận hành, bật <code>payout.test_enabled</code>; thử xong nhớ tắt lại. Mỗi lần thử bị giới hạn bởi{" "}
            <code>payout.test_max_amount</code> (hiện {formatVnd(c.maxAmount)}).
          </p>
        ) : !c.configured ? (
          <p className="text-sm text-destructive">Server chưa có khoá chi PayOS (EF_PAYOS_PAYOUT_CLIENT_ID / API_KEY / CHECKSUM_KEY) nên chưa gửi lệnh được.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Số dư tài khoản chi PayOS: <b>{c.balance === null ? "không tra được" : formatVnd(Number(c.balance))}</b> · mỗi lần tối đa <b>{formatVnd(c.maxAmount)}</b>. Lệnh này
              chuyển <b>tiền thật</b>, không gắn với đơn hay shop nào.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                Ngân hàng nhận
                <NativeSelect value={bankCode} onChange={(e) => setBankCode(e.target.value)}>
                  <optgroup label="Phổ biến">
                    {popular.map((b) => (
                      <option key={b.bin} value={b.bin}>
                        {b.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Khác">
                    {others.map((b) => (
                      <option key={b.bin} value={b.bin}>
                        {b.name}
                      </option>
                    ))}
                  </optgroup>
                </NativeSelect>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Số tài khoản nhận
                <Input inputMode="numeric" placeholder="6–20 chữ số" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Số tiền (VND)
                <Input
                  inputMode="numeric"
                  placeholder={`1.000 – ${c.maxAmount.toLocaleString("vi-VN")}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Nội dung (tuỳ chọn)
                <Input maxLength={50} value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
            </div>
            <div>
              <Button disabled={!valid || send.isPending} onClick={() => setConfirming(true)}>
                {send.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
                Gửi lệnh thử chi
              </Button>
            </div>
          </>
        )}

        {send.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {testTransferErrorMessage(send.error)}
          </p>
        ) : null}
        {result ? (
          <div role="status" className="rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium">{OUTCOME_TEXT[result.outcome]}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Mã tham chiếu {result.referenceId} · PayOS: {result.code} — {result.message}
            </p>
            {result.transactionId ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" disabled={check.isPending} onClick={() => check.mutate(result.transactionId as string)}>
                  {check.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
                  Kiểm tra trạng thái
                </Button>
                {check.data ? (
                  <span className="text-sm">
                    {STATE_TEXT[check.data.state]} — {check.data.detail}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        destructive
        title="Chuyển tiền thật?"
        description={`Sẽ chuyển ${formatVnd(amountNum)} từ tài khoản chi PayOS tới ${bankNameByBin(bankCode) ?? bankCode} · ${accountNumber}. Lệnh đã gửi không thu hồi được từ đây.`}
        confirmLabel="Chuyển tiền"
        onConfirm={submit}
      />
    </Card>
  );
}
