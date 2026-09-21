"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, KeyRoundIcon, LockIcon, PencilIcon, ShieldCheckIcon, UnlockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailList } from "@/components/shared/detail-list";
import { InitialsAvatar } from "@/components/shared/initials-avatar";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { CUSTOMER_ROLE, PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { statusMeta, USER_STATUS } from "@/lib/labels";
import { useAdminUser, useSetUserStatus } from "@/features/identity/hooks/use-admin-users";
import { EditUserDialog } from "@/features/identity/components/users/edit-user-dialog";
import { ResetPasswordUserDialog } from "@/features/identity/components/users/reset-password-user-dialog";
import { UserPermissionsDialog } from "@/features/identity/components/users/user-permissions-dialog";

const LOAD_ERROR = "Không tải được hồ sơ người dùng.";

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}

/*
 * Chi tiết một người dùng: hồ sơ + hành động (sửa, khoá/mở, đặt lại mật khẩu,
 * quyền riêng). Mỗi nút khoá theo mã quyền tương ứng (lớp 2); quyền riêng chỉ
 * có nghĩa với NHÂN VIÊN (khách không có quyền quản trị).
 */
export function UserDetail({ id }: { id: string }) {
  const { data: user, isPending, error } = useAdminUser(id);
  const setStatus = useSetUserStatus(id);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [permOpen, setPermOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;
  if (isPending || !user) return <DetailSkeleton />;

  const status = statusMeta(USER_STATUS, user.status);
  const isStaff = user.roleCode !== CUSTOMER_ROLE;
  const locked = user.status === "locked";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={user.fullName || user.email} description={`${user.roleName} · ${user.email}`}>
        <Button variant="outline" nativeButton={false} render={<Link href={ROUTES.identity.users} />}>
          <ArrowLeftIcon className="size-4" />
          Danh sách
        </Button>
        {isStaff ? (
          <PermissionGate permission={PERMISSIONS.userUpdate}>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <PencilIcon className="size-4" />
              Sửa
            </Button>
          </PermissionGate>
        ) : null}
        <PermissionGate permission={PERMISSIONS.userLock}>
          <Button variant={locked ? "default" : "destructive"} onClick={() => setLockOpen(true)} disabled={setStatus.isPending}>
            {locked ? <UnlockIcon className="size-4" /> : <LockIcon className="size-4" />}
            {locked ? "Mở khoá" : "Khoá tài khoản"}
          </Button>
        </PermissionGate>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-base">
              <InitialsAvatar name={user.fullName || user.email} src={user.avatarUrl ?? undefined} className="size-10" />
              Hồ sơ
              <StatusBadge tone={status.tone} className="ml-auto">
                {status.label}
              </StatusBadge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList
              rows={[
                { label: "Email", value: user.email },
                { label: "Họ tên", value: user.fullName },
                { label: "Số điện thoại", value: user.phone || "—" },
                { label: "Vai trò", value: user.roleName },
                { label: "Xác minh email", value: formatDateTime(user.emailVerifiedAt) },
                { label: "Đăng nhập cuối", value: formatDateTime(user.lastLoginAt) },
                { label: "Lý do khoá", value: user.lockedReason || "—" },
                { label: "Tạo lúc", value: formatDateTime(user.createdAt) },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bảo mật & quyền</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <PermissionGate permission={PERMISSIONS.userUpdate}>
              <Button variant="outline" className="justify-start" onClick={() => setResetOpen(true)}>
                <KeyRoundIcon className="size-4" />
                Đặt lại mật khẩu
              </Button>
            </PermissionGate>
            {isStaff ? (
              <PermissionGate permission={PERMISSIONS.permissionAssign}>
                <Button variant="outline" className="justify-start" onClick={() => setPermOpen(true)}>
                  <ShieldCheckIcon className="size-4" />
                  Quyền cấp / chặn riêng
                </Button>
              </PermissionGate>
            ) : (
              <p className="text-sm text-muted-foreground">Tài khoản khách hàng — không có quyền quản trị.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <EditUserDialog open={editOpen} onOpenChange={setEditOpen} user={user} />
      <ResetPasswordUserDialog open={resetOpen} onOpenChange={setResetOpen} userId={user.id} />
      {isStaff ? <UserPermissionsDialog open={permOpen} onOpenChange={setPermOpen} user={user} /> : null}
      <ConfirmDialog
        open={lockOpen}
        onOpenChange={setLockOpen}
        title={locked ? "Mở khoá tài khoản?" : "Khoá tài khoản?"}
        description={
          locked
            ? "Người dùng sẽ đăng nhập lại được ngay."
            : "Mọi phiên đang đăng nhập của người này bị thu hồi ngay lập tức."
        }
        confirmLabel={locked ? "Mở khoá" : "Khoá"}
        destructive={!locked}
        onConfirm={() =>
          setStatus.mutate(
            locked ? { status: "active" } : { status: "locked", reason: "Khoá bởi quản trị viên" },
          )
        }
      />
    </div>
  );
}
