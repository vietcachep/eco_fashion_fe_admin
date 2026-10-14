"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightIcon, Loader2Icon, LockIcon, MailIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/shared/form-message";
import { firstAllowedRoute, ROUTES } from "@/lib/constants";
import { useLogin } from "@/features/identity/hooks/use-login";
import { loginSchema, type LoginInput } from "@/features/identity/schemas/login-schema";

/*
 * Tài khoản DEMO của dữ liệu seed backend (scripts/seed/identity.seed.ts) — chỉ hiện ở môi trường phát triển để chọn nhanh một vai.
 * Production KHÔNG bao giờ in mật khẩu mẫu ra giao diện.
 */
const SHOW_DEMO_ACCOUNTS = process.env.NODE_ENV !== "production";
const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@ecofashion.vn", pass: "Admin123456!" },
  { label: "Quản lý", email: "manager@ecofashion.vn", pass: "NhanVien123!" },
  { label: "Bán hàng", email: "sales@ecofashion.vn", pass: "NhanVien123!" },
  { label: "Kho", email: "warehouse@ecofashion.vn", pass: "NhanVien123!" },
  { label: "Kế toán", email: "accountant@ecofashion.vn", pass: "NhanVien123!" },
  { label: "Marketing", email: "marketing@ecofashion.vn", pass: "NhanVien123!" },
] as const;

/*
 * Form đăng nhập: React Hook Form + Zod (State Rule). Form thuần — bố cục /
 * thương hiệu trang nằm ở (auth)/login/page.tsx. Submit đi qua mutation
 * useLogin; component không đụng token.
 */
export function LoginForm() {
  const router = useRouter();
  const loginMutation = useLogin();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const errors = form.formState.errors;

  return (
    <form
      method="post" // không bao giờ gửi kiểu GET: bấm trước khi trang hydrate sẽ làm lộ email/mật khẩu trên URL
      onSubmit={form.handleSubmit((input) =>
        loginMutation.mutate(input, { onSuccess: ({ codes, scope }) => router.push(firstAllowedRoute(codes, scope)) }),
      )}
      noValidate
    >
      <FieldGroup className="gap-4.5">
        <Field>
          <FieldLabel htmlFor="email" className="text-foreground">
            Email
          </FieldLabel>
          <div className="relative">
            <MailIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              id="email"
              type="email"
              className="h-11 rounded-xl bg-background pl-10 shadow-none transition-shadow aria-invalid:ring-2 aria-invalid:ring-destructive/10"
              placeholder="admin@ecofashion.vn"
              autoComplete="username"
              aria-invalid={!!errors.email}
              {...form.register("email")}
            />
          </div>
          <FormMessage message={errors.email?.message} />
        </Field>

        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password" className="text-foreground">
              Mật khẩu
            </FieldLabel>
            <Link href={ROUTES.forgotPassword} className="text-xs font-medium text-primary hover:underline">
              Quên mật khẩu?
            </Link>
          </div>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              id="password"
              type="password"
              className="h-11 rounded-xl bg-background pl-10 shadow-none transition-shadow aria-invalid:ring-2 aria-invalid:ring-destructive/10"
              placeholder="••••••••"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...form.register("password")}
            />
          </div>
          <FormMessage message={errors.password?.message} />
        </Field>

        <Button
          type="submit"
          className="group/submit h-11 w-full rounded-xl text-[15px] font-semibold shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/25"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Đăng nhập
          <ArrowRightIcon className="size-4 transition-transform group-hover/submit:translate-x-0.5" />
        </Button>

        {SHOW_DEMO_ACCOUNTS ? (
          <div className="pt-2">
            <div className="relative flex items-center justify-center">
              <span className="h-px w-full bg-border" />
              <span className="absolute bg-card px-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Thử nghiệm nhanh theo vai trò
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    form.setValue("email", acc.email);
                    form.setValue("password", acc.pass);
                  }}
                  className="rounded-lg border border-border/80 bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </FieldGroup>
    </form>
  );
}
