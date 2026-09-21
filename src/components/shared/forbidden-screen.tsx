"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ShieldAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

/*
 * Màn hình 403 — dùng chung cho cả hai kiểu chặn quyền:
 *   1. Route /403 (redirect đích khi guard chặn sớm).
 *   2. Chặn tại chỗ: bọc quanh nội dung màn hình, giữ nguyên URL + sidebar.
 *
 * Thuần trình bày: không gọi API, không tự kiểm tra quyền — nơi gọi quyết
 * định khi nào hiện (AGENTS.md Rule 3 — tách lớp giao diện / dữ liệu).
 *
 * `permissionCode` hiện mã quyền còn thiếu để nhân viên đọc đúng mã báo cho
 * admin, khỏi phải mô tả "vào chỗ kia không được".
 */
export function ForbiddenScreen({
  title = "Bạn không có quyền truy cập",
  description = "Tài khoản của bạn chưa được cấp quyền cho chức năng này. Liên hệ quản trị viên để được cấp quyền.",
  permissionCode,
  showBack = true,
}: {
  title?: string;
  description?: string;
  permissionCode?: string;
  showBack?: boolean;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
        <ShieldAlertIcon className="size-7 text-destructive" />
      </div>

      <p className="text-5xl font-semibold tracking-tight">403</p>

      <div className="flex flex-col gap-1.5">
        <p className="text-base font-medium">{title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>

      {permissionCode && (
        <p className="text-xs text-muted-foreground">
          Quyền cần có:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
            {permissionCode}
          </code>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        {showBack && (
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeftIcon data-icon="inline-start" />
            Quay lại
          </Button>
        )}
        <Button nativeButton={false} render={<Link href={ROUTES.dashboard} />}>
          Về Dashboard
        </Button>
      </div>
    </div>
  );
}
