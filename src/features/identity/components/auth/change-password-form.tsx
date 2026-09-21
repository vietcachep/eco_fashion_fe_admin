"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/shared/form-message";
import { useChangePassword } from "@/features/identity/hooks/use-change-password";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/features/identity/schemas/change-password-schema";

/* Đổi mật khẩu của chính mình — sau khi đổi backend thu hồi mọi phiên. */
export function ChangePasswordForm() {
  const mutation = useChangePassword();
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const errors = form.formState.errors;

  return (
    <form noValidate onSubmit={form.handleSubmit((input) => mutation.mutate(input))}>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="currentPassword">Mật khẩu hiện tại</FieldLabel>
          <Input id="currentPassword" type="password" autoComplete="current-password" aria-invalid={!!errors.currentPassword} {...form.register("currentPassword")} />
          <FormMessage message={errors.currentPassword?.message} />
        </Field>
        <Field>
          <FieldLabel htmlFor="newPassword">Mật khẩu mới</FieldLabel>
          <Input id="newPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.newPassword} {...form.register("newPassword")} />
          <FormMessage message={errors.newPassword?.message} />
        </Field>
        <Field>
          <FieldLabel htmlFor="confirmPassword">Nhập lại mật khẩu mới</FieldLabel>
          <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...form.register("confirmPassword")} />
          <FormMessage message={errors.confirmPassword?.message} />
        </Field>
        <p className="text-xs text-muted-foreground">
          Sau khi đổi, mọi thiết bị đang đăng nhập (kể cả thiết bị này) sẽ phải đăng nhập lại.
        </p>
        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Đổi mật khẩu
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
