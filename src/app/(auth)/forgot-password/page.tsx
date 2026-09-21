import type { Metadata } from "next";
import { AuthCard } from "@/features/identity/components/auth/auth-card";
import { ForgotPasswordForm } from "@/features/identity/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Quên mật khẩu" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Quên mật khẩu"
      description="Nhập email tài khoản nhân viên, chúng tôi sẽ gửi mã xác nhận 6 số."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
