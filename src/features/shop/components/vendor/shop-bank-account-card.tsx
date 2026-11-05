"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClockIcon, LandmarkIcon, Loader2Icon, ShieldAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailList } from "@/components/shared/detail-list";
import { FormMessage } from "@/components/shared/form-message";
import { NativeSelect } from "@/components/shared/native-select";
import { StatusBadge } from "@/components/shared/status-badge";
import { usePermission } from "@/hooks/use-permission";
import { apiErrorMessage } from "@/lib/api-error";
import { PERMISSIONS } from "@/lib/constants";
import { SHOP_BANK_STATUS, statusMeta } from "@/lib/labels";
import type { ShopResponse } from "@/lib/api/generated/model";
import { isGoogleLinkedBankPasswordError, useUpdateMyShop } from "@/features/shop/hooks/use-shop-profile";
import { normalizeBankAccountName, shopBankSchema, type ShopBankInput } from "@/features/shop/schemas/shop-bank-schema";
import { bankNameByBin, VN_BANKS } from "@/features/shop/types/bank-list";

/*
 * Tài khoản ngân hàng nhận tiền đối soát (kỳ đối soát chi về đây). Backend chỉ trả bản che số (`bankAccountNumberMasked`)
 * nên không điền sẵn số cũ được; đổi tài khoản = nhập lại số + tên chủ TK, và vì đây là đường tiền ra khỏi sàn nên
 * backend tạm giữ chi trả + báo mọi thành viên shop (chống kẻ chiếm phiên đổi trộm TK) — nói rõ trong ConfirmDialog.
 * Số giờ giữ là cấu hình của sàn (`bankChangeHoldHours`, mặc định 72) nên LUÔN đọc từ hồ sơ shop, không ghi cứng.
 * Tên chủ TK lệch họ tên chủ shop → `bankStatus = pending_verification`: chi trả giữ tới khi quản lý sàn xác minh.
 */
const holdNotice = (hours: number) => `Đổi tài khoản sẽ tạm giữ chi trả ${hours} giờ và thông báo cho mọi thành viên shop.`;

/* Thông báo sau khi lưu: tên khớp → đếm giờ giữ ngay; tên lệch → chờ sàn xác minh rồi mới đếm. */
function savedMessage(shop: ShopResponse): string {
  return shop.bankStatus === "pending_verification"
    ? "Đã cập nhật tài khoản ngân hàng — đang chờ sàn xác minh vì tên chủ tài khoản khác tên chủ shop; chi trả tạm giữ tới khi được xác minh."
    : `Đã cập nhật tài khoản ngân hàng — chi trả tạm giữ ${shop.bankChangeHoldHours} giờ.`;
}

export function ShopBankAccountCard({ shop }: { shop: ShopResponse }) {
  const canEdit = usePermission(PERMISSIONS.shopProfileUpdate);
  const [editing, setEditing] = useState(false);
  const hasBank = !!shop.bankCode && !!shop.bankAccountNumberMasked;
  const awaitingVerification = hasBank && shop.bankStatus === "pending_verification";
  const bankStatus = statusMeta(SHOP_BANK_STATUS, shop.bankStatus);
  // BIN ngoài danh sách (backend vẫn nhận) → hiện mã BIN thay cho tên.
  const bankName = bankNameByBin(shop.bankCode) ?? (shop.bankCode ? `Mã BIN ${shop.bankCode}` : "—");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LandmarkIcon className="size-4 text-muted-foreground" />
          Tài khoản ngân hàng nhận tiền đối soát
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {hasBank ? (
          <DetailList
            rows={[
              { label: "Ngân hàng", value: bankName },
              { label: "Số tài khoản", value: <span className="font-mono tracking-wide">{shop.bankAccountNumberMasked}</span> },
              { label: "Chủ tài khoản", value: shop.bankAccountName },
              { label: "Trạng thái", value: <StatusBadge tone={bankStatus.tone}>{bankStatus.label}</StatusBadge> },
            ]}
          />
        ) : (
          <div role="status" className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            Chưa khai báo tài khoản ngân hàng — sàn chưa thể chi trả đối soát cho gian hàng của bạn.
          </div>
        )}

        {awaitingVerification ? (
          <div role="status" className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            <ClockIcon className="mt-0.5 size-4 shrink-0" />
            <p>
              Tài khoản đang chờ sàn xác minh vì tên chủ tài khoản khác tên chủ shop; chi trả tạm giữ tới khi được xác minh. Sau khi được xác minh, chi trả còn tạm
              giữ thêm {shop.bankChangeHoldHours} giờ.
            </p>
          </div>
        ) : null}

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldAlertIcon className="mt-0.5 size-3.5 shrink-0" />
          <span>{holdNotice(shop.bankChangeHoldHours)} Số tài khoản luôn được che, chỉ hiện 4 số cuối.</span>
        </p>

        {editing ? (
          <BankAccountForm shop={shop} onCancel={() => setEditing(false)} />
        ) : canEdit ? (
          <div>
            <Button variant="outline" onClick={() => setEditing(true)}>
              {hasBank ? "Đổi tài khoản" : "Khai báo tài khoản"}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Chỉ chủ gian hàng được thay đổi tài khoản ngân hàng.</p>
        )}
      </CardContent>
    </Card>
  );
}

/*
 * Form nhập tài khoản mới. Mount mới mỗi lần mở (state `editing` ở cha) nên không cần reset thủ công. Lưu thành công →
 * backend đổi updatedAt → cha dựng lại thẻ (key) và form tự đóng.
 */
function BankAccountForm({ shop, onCancel }: { shop: ShopResponse; onCancel: () => void }) {
  const update = useUpdateMyShop(savedMessage);
  const [pending, setPending] = useState<ShopBankInput | null>(null);
  const form = useForm<ShopBankInput>({
    resolver: zodResolver(shopBankSchema),
    defaultValues: { bankCode: shop.bankCode ?? "", bankAccountNumber: "", bankAccountName: "", currentPassword: "" },
  });
  const errors = form.formState.errors;
  // BIN hiện có nhưng ngoài danh sách → vẫn phải chọn lại được đúng giá trị đó.
  const unknownCurrentBin = shop.bankCode && !bankNameByBin(shop.bankCode) ? shop.bankCode : null;
  const popular = VN_BANKS.filter((b) => b.popular);
  const others = VN_BANKS.filter((b) => !b.popular);

  const hold = holdNotice(shop.bankChangeHoldHours);
  const confirmDescription = pending
    ? `Tài khoản mới: ${bankNameByBin(pending.bankCode) ?? `BIN ${pending.bankCode}`} •••• ${pending.bankAccountNumber.slice(-4)} — ${pending.bankAccountName}. ${hold} Nếu tên chủ tài khoản khác tên chủ shop, chi trả giữ tới khi sàn xác minh.`
    : hold;

  const numberField = form.register("bankAccountNumber");
  const nameField = form.register("bankAccountName");

  return (
    <>
      <form
        noValidate
        onSubmit={form.handleSubmit((input) => setPending(input))}
        className="flex flex-col gap-4 rounded-xl border bg-muted/30 p-3 sm:p-4"
      >
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="bank-code">Ngân hàng</FieldLabel>
            <NativeSelect id="bank-code" aria-invalid={!!errors.bankCode} {...form.register("bankCode")}>
              <option value="">— Chọn ngân hàng —</option>
              {unknownCurrentBin ? <option value={unknownCurrentBin}>Mã BIN {unknownCurrentBin} (hiện tại)</option> : null}
              <optgroup label="Phổ biến">
                {popular.map((b) => (
                  <option key={b.bin} value={b.bin}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Ngân hàng khác">
                {others.map((b) => (
                  <option key={b.bin} value={b.bin}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
            </NativeSelect>
            <FormMessage message={errors.bankCode?.message} />
          </Field>
          <Field>
            <FieldLabel htmlFor="bank-number">Số tài khoản</FieldLabel>
            <Input
              id="bank-number"
              inputMode="numeric"
              autoComplete="off"
              maxLength={20}
              placeholder="6–20 chữ số"
              aria-invalid={!!errors.bankAccountNumber}
              {...numberField}
              onChange={(e) => {
                // Chỉ giữ chữ số (người dùng hay dán kèm khoảng trắng/dấu chấm) rồi chuyển tiếp cho RHF.
                e.target.value = e.target.value.replace(/\D/g, "");
                void numberField.onChange(e);
              }}
            />
            <FormMessage message={errors.bankAccountNumber?.message} />
          </Field>
          <Field>
            <FieldLabel htmlFor="bank-name">Tên chủ tài khoản</FieldLabel>
            <Input
              id="bank-name"
              autoComplete="off"
              maxLength={120}
              placeholder="NGUYEN VAN A"
              aria-invalid={!!errors.bankAccountName}
              {...nameField}
              onChange={(e) => {
                // Tự bỏ dấu + IN HOA để khớp tên in trên sao kê; chuyển tiếp giá trị đã chuẩn hoá cho RHF.
                e.target.value = normalizeBankAccountName(e.target.value);
                void nameField.onChange(e);
              }}
            />
            <FormMessage message={errors.bankAccountName?.message} />
            <p className="text-xs text-muted-foreground">
              Nhập lại tên chủ tài khoản, IN HOA không dấu, đúng như trên thẻ/sổ ngân hàng.
            </p>
          </Field>
          <Field>
            <FieldLabel htmlFor="bank-password">Mật khẩu đăng nhập của bạn</FieldLabel>
            <Input
              id="bank-password"
              type="password"
              autoComplete="current-password"
              maxLength={128}
              placeholder="Nhập để xác nhận đổi nơi nhận tiền"
              aria-invalid={!!errors.currentPassword}
              {...form.register("currentPassword")}
            />
            <FormMessage message={errors.currentPassword?.message} />
            <p className="text-xs text-muted-foreground">Bắt buộc khi đổi tài khoản nhận tiền — để chắc chắn là chính bạn thao tác, không phải người khác đang dùng phiên của bạn.</p>
          </Field>
        </FieldGroup>
        {isGoogleLinkedBankPasswordError(update.error) ? (
          <GoogleAccountPasswordHint message={apiErrorMessage(update.error, "Mật khẩu không đúng.")} />
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={update.isPending}>
            Hủy
          </Button>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Lưu tài khoản
          </Button>
        </div>
      </form>
      {/* Ngoài <form>: sự kiện trong portal của dialog vẫn nổi bọt lên form cha theo cây React. */}
      <ConfirmDialog
        open={!!pending}
        onOpenChange={(v) => !v && setPending(null)}
        title="Xác nhận đổi tài khoản nhận tiền?"
        description={confirmDescription}
        confirmLabel="Xác nhận đổi"
        destructive
        onConfirm={() => pending && update.mutate(pending)}
      />
    </>
  );
}

/*
 * 400 SHOP_BANK_PASSWORD_INVALID kèm `details.googleLinked = "true"`: tài khoản này tạo/liên kết bằng Google nên mật khẩu hiện có là
 * chuỗi ngẫu nhiên không ai biết. Hiện nguyên thông điệp backend + các bước đặt mật khẩu bằng luồng "Quên mật khẩu" (OTP qua email).
 * Không đặt link bấm ở đây: trang /forgot-password nằm sau GuestGuard — người đang đăng nhập bị chuyển hướng ngược về cổng nên phải
 * đăng xuất trước (xem báo cáo PLAN-0040 6.4).
 */
function GoogleAccountPasswordHint({ message }: { message: string }) {
  return (
    <div role="alert" className="flex flex-col gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm">
      <p className="font-medium text-destructive">{message}</p>
      <ol className="list-decimal pl-5 text-xs text-muted-foreground">
        <li>Đăng xuất khỏi cổng quản trị.</li>
        <li>
          Ở màn đăng nhập chọn <b className="text-foreground">Quên mật khẩu</b>, nhập email của bạn để nhận mã OTP và đặt mật khẩu mới.
        </li>
        <li>Đăng nhập lại bằng mật khẩu vừa đặt rồi đổi tài khoản ngân hàng.</li>
      </ol>
    </div>
  );
}
