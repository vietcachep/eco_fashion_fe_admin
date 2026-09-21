"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/shared/form-message";
import { ROUTES } from "@/lib/constants";
import { useResetPassword } from "@/features/identity/hooks/use-forgot-password";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/features/identity/schemas/reset-password-schema";

/*
 * Bước 2 quên mật khẩu: email + OTP 6 số + mật khẩu mới. Email điền sẵn từ
 * query `?email=` (màn trước chuyển sang) nhưng vẫn sửa được.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const mutation = useResetPassword();
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: params.get("email") ?? "",
      otp: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const errors = form.formState.errors;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((input) =>
        mutation.mutate(input, {
          onSuccess: () => {
            toast.success("Đã đặt lại mật khẩu, vui lòng đăng nhập.");
            router.push(ROUTES.login);
          },
        }),
      )}
    >
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" type="email" className="h-11 rounded-xl" autoComplete="username" aria-invalid={!!errors.email} {...form.register("email")} />
          <FormMessage message={errors.email?.message} />
        </Field>
        <Field>
          <FieldLabel htmlFor="otp">Mã xác nhận (6 số trong email)</FieldLabel>
          <Input id="otp" inputMode="numeric" maxLength={6} className="h-11 rounded-xl font-mono tracking-[.3em]" placeholder="123456" aria-invalid={!!errors.otp} {...form.register("otp")} />
          <FormMessage message={errors.otp?.message} />
        </Field>
        <Field>
          <FieldLabel htmlFor="newPassword">Mật khẩu mới</FieldLabel>
          <Input id="newPassword" type="password" className="h-11 rounded-xl" autoComplete="new-password" aria-invalid={!!errors.newPassword} {...form.register("newPassword")} />
          <FormMessage message={errors.newPassword?.message} />
        </Field>
        <Field>
          <FieldLabel htmlFor="confirmPassword">Nhập lại mật khẩu mới</FieldLabel>
          <Input id="confirmPassword" type="password" className="h-11 rounded-xl" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...form.register("confirmPassword")} />
          <FormMessage message={errors.confirmPassword?.message} />
        </Field>
        <Button type="submit" className="h-11 w-full rounded-xl" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Đặt lại mật khẩu
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link href={ROUTES.login} className="font-medium text-primary hover:underline">
            Quay lại đăng nhập
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
