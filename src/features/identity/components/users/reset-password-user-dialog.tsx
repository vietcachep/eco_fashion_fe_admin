"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { FormMessage } from "@/components/shared/form-message";
import { useAdminResetPassword } from "@/features/identity/hooks/use-admin-users";
import {
  adminResetPasswordSchema,
  type AdminResetPasswordInput,
} from "@/features/identity/schemas/create-staff-schema";

/* Admin đặt mật khẩu mới cho người dùng (mở từ nút đã khoá quyền). */
export function ResetPasswordUserDialog({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}) {
  const reset = useAdminResetPassword(userId);
  const form = useForm<AdminResetPasswordInput>({
    resolver: zodResolver(adminResetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });
  const errors = form.formState.errors;

  const close = (v: boolean) => {
    onOpenChange(v);
    if (!v) form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Đặt lại mật khẩu</DialogTitle>
          <DialogDescription>Mọi phiên đang đăng nhập của người này sẽ bị thu hồi.</DialogDescription>
        </DialogHeader>
        <form
          id="reset-pw-form"
          noValidate
          onSubmit={form.handleSubmit((input) =>
            reset.mutate(input.newPassword, { onSuccess: () => close(false) }),
          )}
        >
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="rp-new">Mật khẩu mới</FieldLabel>
              <Input id="rp-new" type="password" autoComplete="new-password" aria-invalid={!!errors.newPassword} {...form.register("newPassword")} />
              <FormMessage message={errors.newPassword?.message} />
            </Field>
            <Field>
              <FieldLabel htmlFor="rp-confirm">Nhập lại</FieldLabel>
              <Input id="rp-confirm" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...form.register("confirmPassword")} />
              <FormMessage message={errors.confirmPassword?.message} />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Hủy
          </Button>
          <Button type="submit" form="reset-pw-form" disabled={reset.isPending}>
            {reset.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Đặt lại
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
