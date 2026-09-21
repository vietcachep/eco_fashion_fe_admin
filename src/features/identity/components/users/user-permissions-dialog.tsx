"use client";

import { useMemo, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import {
  useAdminRoles,
  useSaveUserOverrides,
  useUserOverrides,
} from "@/features/identity/hooks/use-admin-roles";
import {
  OverridePermissionTree,
  type OverrideState,
} from "@/features/identity/components/shared/permission-tree-editor";
import type {
  UserPermissionOverrideItem,
  UserPermissionOverrideResponse,
  UserProfileResponse,
} from "@/lib/api/generated/model";

/*
 * Quyền cấp / chặn riêng cho một nhân viên. Nền = bộ quyền của VAI người đó;
 * mỗi mã chọn: theo vai / cấp thêm / chặn. Khi lưu chỉ gửi mã THAY ĐỔI: về
 * "theo vai" gửi allowed=null để backend gỡ override.
 */
export function UserPermissionsDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfileResponse;
}) {
  const roles = useAdminRoles();
  const overrides = useUserOverrides(open ? user.id : "");
  const baseline = useMemo(
    () => new Set(roles.data?.find((r) => r.code === user.roleCode)?.permissionCodes ?? []),
    [roles.data, user.roleCode],
  );
  const loading = roles.isPending || overrides.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Quyền riêng — {user.fullName}</DialogTitle>
          <DialogDescription>
            Vai <b>{user.roleName}</b> là nền; cấp thêm hoặc chặn từng quyền cho riêng người này. Chấm xanh = quyền
            hiệu lực.
          </DialogDescription>
        </DialogHeader>
        {overrides.error ? (
          <ApiErrorState error={overrides.error} fallback="Không tải được quyền riêng." compact />
        ) : loading || !overrides.data ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          /* key theo lần tải: dữ liệu override mới → editor dựng state mới, không cần effect. */
          <OverridesEditor
            key={overrides.dataUpdatedAt}
            userId={user.id}
            baseline={baseline}
            current={overrides.data}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function OverridesEditor({
  userId,
  baseline,
  current,
  onDone,
}: {
  userId: string;
  baseline: Set<string>;
  current: UserPermissionOverrideResponse[];
  onDone: () => void;
}) {
  const save = useSaveUserOverrides(userId);
  const [state, setState] = useState<Map<string, OverrideState>>(
    () => new Map(current.map((o) => [o.code, o.allowed ? "allow" : "deny"])),
  );

  const submit = () => {
    const original = new Map(current.map((o) => [o.code, o.allowed ? "allow" : "deny"]));
    const items: UserPermissionOverrideItem[] = [];
    for (const [code, s] of state) {
      if (s === "inherit") {
        if (original.has(code)) items.push({ code, allowed: null });
      } else if (original.get(code) !== s) {
        items.push({ code, allowed: s === "allow" });
      }
    }
    if (items.length === 0) {
      onDone();
      return;
    }
    save.mutate(items, { onSuccess: onDone });
  };

  return (
    <>
      <OverridePermissionTree
        baseline={baseline}
        value={state}
        disabled={save.isPending}
        onChange={(code, s) => setState((prev) => new Map(prev).set(code, s))}
      />
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Đóng
        </Button>
        <Button onClick={submit} disabled={save.isPending}>
          {save.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Lưu quyền riêng
        </Button>
      </DialogFooter>
    </>
  );
}
