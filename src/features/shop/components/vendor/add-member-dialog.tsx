"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CircleCheckIcon, CopyIcon, Loader2Icon, UserPlusIcon, WandSparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/shared/form-message";
import { NativeSelect } from "@/components/shared/native-select";
import { PermissionGate } from "@/components/shared/permission-gate";
import { apiErrorCode, apiErrorMessage, apiStatus } from "@/lib/api-error";
import { PERMISSIONS } from "@/lib/constants";
import { SHOP_MEMBER_ROLE_LABEL } from "@/lib/labels";
import { useAddShopMember } from "@/features/shop/hooks/use-shop-members";
import { shopMemberAddSchema, type ShopMemberAddInput } from "@/features/shop/schemas/shop-member-schema";

const EMAIL_EXISTS_CODE = "IDENTITY_EMAIL_EXISTS";
const WEAK_PASSWORD_CODE = "IDENTITY_PASSWORD_WEAK";
const LETTERS = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"; // bỏ ký tự dễ nhầm (l, I, o, O)
const DIGITS = "23456789"; // bỏ 0, 1

/* Mật khẩu ngẫu nhiên 10 ký tự (7 chữ + 3 số, xáo trộn) — luôn đạt luật "có chữ và số". Dùng crypto, không dùng Math.random. */
function generatePassword(): string {
  const pick = (alphabet: string, n: number) => {
    const bytes = new Uint32Array(n);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  };
  const chars = [...pick(LETTERS, 7), ...pick(DIGITS, 3)];
  const order = new Uint32Array(chars.length);
  crypto.getRandomValues(order);
  return chars
    .map((c, i) => ({ c, k: order[i] }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.c)
    .join("");
}

/* Lỗi KHÔNG gắn riêng vào một ô: hạn mức, hết chỗ, … — còn lại hiện nguyên văn thông báo của backend. */
function addErrorMessage(err: unknown): string {
  if (apiStatus(err) === 429) return "Bạn đã thêm quá nhiều nhân viên trong một giờ (tối đa 30). Vui lòng thử lại sau.";
  return apiErrorMessage(err, "Không thêm được nhân viên. Vui lòng thử lại.");
}

/*
 * Nút "Thêm nhân viên" + popup form (POST /shop/members) — nút tự ẩn khi thiếu quyền shop.staff.invite (mã quyền giữ tên cũ).
 * Chủ shop TẠO TÀI KHOẢN cho nhân viên: nhập họ tên, email, mật khẩu ban đầu và vai; nhân viên đăng nhập được ngay, không cần mời/chấp nhận.
 */
export function AddMemberButton() {
  const [open, setOpen] = useState(false);
  return (
    <PermissionGate permission={PERMISSIONS.shopStaffAdd}>
      <Button onClick={() => setOpen(true)}>
        <UserPlusIcon className="size-4" />
        Thêm nhân viên
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">{open ? <AddMemberBody onClose={() => setOpen(false)} /> : null}</DialogContent>
      </Dialog>
    </PermissionGate>
  );
}

/* Thân dialog mount mới mỗi lần mở → form và trạng thái mutation tự sạch, không cần reset tay khi đóng/mở lại. */
function AddMemberBody({ onClose }: { onClose: () => void }) {
  const add = useAddShopMember();
  const form = useForm<ShopMemberAddInput>({
    resolver: zodResolver(shopMemberAddSchema),
    defaultValues: { fullName: "", email: "", password: "", roleCode: "shop_staff" },
  });
  const errors = form.formState.errors;
  const code = add.isError ? apiErrorCode(add.error) : undefined;
  // Lỗi có ô riêng (email trùng, mật khẩu yếu) gắn vào ô đó; lỗi khác hiện ở khung cảnh báo chung bên dưới.
  const formError = add.isError && code !== EMAIL_EXISTS_CODE && code !== WEAK_PASSWORD_CODE ? addErrorMessage(add.error) : undefined;

  if (add.isSuccess) return <AddedNotice result={add.data} password={add.variables?.password ?? ""} onAgain={() => { add.reset(); form.reset(); }} onClose={onClose} />;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Thêm nhân viên vào gian hàng</DialogTitle>
        <DialogDescription>
          Bạn tạo tài khoản cho nhân viên; họ đăng nhập được ngay bằng email và mật khẩu bạn đặt (không cần lời mời). Hãy gửi thông tin đăng nhập cho họ và dặn
          đổi mật khẩu sau lần đầu. Nhân viên từng làm ở shop (đã gỡ) thì nhập lại đúng email cũ — tài khoản cũ được khôi phục, mật khẩu không đổi.
        </DialogDescription>
      </DialogHeader>
      <form
        id="add-member-form"
        noValidate
        onSubmit={form.handleSubmit((input) =>
          add.mutate(input, {
            onError: (e) => {
              const c = apiErrorCode(e);
              if (c === EMAIL_EXISTS_CODE) form.setError("email", { type: "server", message: apiErrorMessage(e, "Email này đã có tài khoản — hãy dùng email khác.") });
              if (c === WEAK_PASSWORD_CODE) form.setError("password", { type: "server", message: apiErrorMessage(e, "Mật khẩu 8–64 ký tự, gồm cả chữ và số.") });
            },
          }),
        )}
      >
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="member-name">Họ và tên</FieldLabel>
            <Input id="member-name" autoComplete="off" placeholder="Nguyễn Văn Kho" aria-invalid={!!errors.fullName} {...form.register("fullName")} />
            <FormMessage message={errors.fullName?.message} />
          </Field>
          <Field>
            <FieldLabel htmlFor="member-email">Email đăng nhập</FieldLabel>
            <Input id="member-email" type="email" autoComplete="off" placeholder="nhanvien@vidu.vn" aria-invalid={!!errors.email} {...form.register("email")} />
            <FormMessage message={errors.email?.message} />
          </Field>
          <Field>
            <FieldLabel htmlFor="member-password">Mật khẩu ban đầu</FieldLabel>
            <div className="flex gap-2">
              <Input id="member-password" type="text" autoComplete="new-password" placeholder="Ít nhất 8 ký tự, gồm chữ và số" aria-invalid={!!errors.password} {...form.register("password")} />
              <Button type="button" variant="outline" className="shrink-0" onClick={() => form.setValue("password", generatePassword(), { shouldValidate: true })}>
                <WandSparklesIcon className="size-4" />
                Tạo ngẫu nhiên
              </Button>
            </div>
            <FormMessage message={errors.password?.message} />
          </Field>
          <Field>
            <FieldLabel htmlFor="member-role">Vai trò trong shop</FieldLabel>
            <NativeSelect id="member-role" {...form.register("roleCode")}>
              {Object.entries(SHOP_MEMBER_ROLE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </NativeSelect>
          </Field>
          {formError ? (
            <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          ) : null}
        </FieldGroup>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" form="add-member-form" disabled={add.isPending}>
          {add.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Thêm nhân viên
        </Button>
      </DialogFooter>
    </>
  );
}

/* Màn kết quả: nhắc chủ shop gửi thông tin đăng nhập; tài khoản được KHÔI PHỤC thì mật khẩu cũ vẫn dùng (không hiện mật khẩu vừa gõ vì nó không có hiệu lực). */
function AddedNotice({ result, password, onAgain, onClose }: { result: { fullName: string; email: string; restored: boolean }; password: string; onAgain: () => void; onClose: () => void }) {
  async function copy() {
    const text = result.restored ? `Email đăng nhập: ${result.email}` : `Email đăng nhập: ${result.email}\nMật khẩu ban đầu: ${password}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Đã sao chép thông tin đăng nhập.");
    } catch {
      toast.error("Không sao chép được — hãy tự chép thông tin bên trên.");
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CircleCheckIcon className="size-5 text-emerald-600" />
          {result.restored ? "Đã thêm lại nhân viên" : "Đã thêm nhân viên"}
        </DialogTitle>
        <DialogDescription>
          {result.restored
            ? `Tài khoản cũ của ${result.fullName} đã được khôi phục vào gian hàng. Họ đăng nhập bằng mật khẩu cũ của mình (mật khẩu bạn vừa nhập không được áp dụng).`
            : `${result.fullName} đã có thể đăng nhập ngay. Hãy gửi thông tin bên dưới cho họ và dặn đổi mật khẩu sau lần đăng nhập đầu.`}
        </DialogDescription>
      </DialogHeader>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
        <dt className="text-muted-foreground">Email đăng nhập</dt>
        <dd className="break-all font-medium">{result.email}</dd>
        {result.restored ? null : (
          <>
            <dt className="text-muted-foreground">Mật khẩu ban đầu</dt>
            <dd className="break-all font-mono font-medium">{password}</dd>
          </>
        )}
      </dl>
      <DialogFooter>
        <Button variant="outline" onClick={copy}>
          <CopyIcon className="size-4" />
          Sao chép
        </Button>
        <Button variant="outline" onClick={onAgain}>
          Thêm người khác
        </Button>
        <Button onClick={onClose}>Xong</Button>
      </DialogFooter>
    </>
  );
}
