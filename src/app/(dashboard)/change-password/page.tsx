import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ChangePasswordForm } from "@/features/identity/components/auth/change-password-form";

export const metadata: Metadata = { title: "Đổi mật khẩu" };

export default function ChangePasswordPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Đổi mật khẩu" description="Mật khẩu 8–64 ký tự, gồm cả chữ và số" />
      <Card className="max-w-lg">
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
