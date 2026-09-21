import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/features/identity/components/auth/auth-card";
import { ResetPasswordForm } from "@/features/identity/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Đặt lại mật khẩu" };

/* Suspense vì form đọc useSearchParams (Next yêu cầu ranh giới khi prerender). */
export default function ResetPasswordPage() {
  return (
    <AuthCard title="Đặt lại mật khẩu" description="Nhập mã xác nhận trong email và mật khẩu mới.">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
