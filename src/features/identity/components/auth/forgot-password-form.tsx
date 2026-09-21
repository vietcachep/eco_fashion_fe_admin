"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/shared/form-message";
import { ROUTES } from "@/lib/constants";
import { useForgotPassword } from "@/features/identity/hooks/use-forgot-password";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/features/identity/schemas/forgot-password-schema";

/*
 * Bước 1 quên mật khẩu: nhập email → backend gửi OTP 6 số (luôn 200). Thành
 * công thì chuyển sang màn đặt lại kèm email trên query để khỏi gõ lại.
 */
export function ForgotPasswordForm() {
  const router = useRouter();
  const mutation = useForgotPassword();
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });
  const errors = form.formState.errors;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((input) =>
        mutation.mutate(input, {
          onSuccess: () =>
            router.push(`${ROUTES.resetPassword}?email=${encodeURIComponent(input.email)}`),
        }),
      )}
    >
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="email">Email tài khoản</FieldLabel>
          <Input
            id="email"
            type="email"
            className="h-11 rounded-xl"
            placeholder="ban@ecofashion.vn"
            autoComplete="username"
            aria-invalid={!!errors.email}
            {...form.register("email")}
          />
          <FormMessage message={errors.email?.message} />
        </Field>
        <Button type="submit" className="h-11 w-full rounded-xl" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Gửi mã xác nhận
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
