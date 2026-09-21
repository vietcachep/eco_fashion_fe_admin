"use client";

import { useState } from "react";
import { Loader2Icon, ShieldIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PERMISSIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAdminRoles, useReplaceRolePermissions } from "@/features/identity/hooks/use-admin-roles";
import { RolePermissionTree } from "@/features/identity/components/shared/permission-tree-editor";
import type { RoleResponse } from "@/lib/api/generated/model";

const LOAD_ERROR = "Không tải được danh sách vai.";

/*
 * Vai trò & bộ quyền: cột trái là 7 vai hệ thống (preset backend), cột phải là
 * cây quyền của vai đang chọn. Vai `admin` luôn toàn quyền và `customer` không
 * có quyền quản trị — hai vai này chỉ xem, không sửa.
 */
export function RolesScreen() {
  const { data: roles, isPending, error } = useAdminRoles();
  const [picked, setPicked] = useState<string>("");
  // Chưa chọn thì mặc định vai "manager" (hay sửa nhất), không dùng effect để set state.
  const selected = picked || roles?.find((r) => r.code === "manager")?.code || roles?.[0]?.code || "";

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;
  if (isPending || !roles) {
    return (
      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const role = roles.find((r) => r.code === selected) ?? roles[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <Card className="py-0">
        <CardContent className="flex flex-col gap-1 p-2">
          {roles.map((r) => (
            <button
              key={r.code}
              type="button"
              onClick={() => setPicked(r.code)}
              className={cn(
                "flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                r.code === role.code ? "bg-primary/10" : "hover:bg-muted",
              )}
            >
              <ShieldIcon className={cn("mt-0.5 size-4 shrink-0", r.code === role.code ? "text-primary" : "text-muted-foreground")} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{r.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{r.description || r.code}</span>
              </span>
              <Badge variant="secondary" className="font-normal">
                {r.permissionCodes.length}
              </Badge>
            </button>
          ))}
        </CardContent>
      </Card>

      <RoleEditor key={role.code} role={role} />
    </div>
  );
}

function RoleEditor({ role }: { role: RoleResponse }) {
  const [value, setValue] = useState<Set<string>>(new Set(role.permissionCodes));
  const replace = useReplaceRolePermissions(role.code);
  const readOnly = role.code === "admin" || role.code === "customer";
  const dirty =
    value.size !== role.permissionCodes.length || role.permissionCodes.some((c) => !value.has(c));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">
            {role.name} <code className="ml-1 font-mono text-xs text-muted-foreground">{role.code}</code>
          </CardTitle>
          <p className="pt-1 text-sm text-muted-foreground">
            {readOnly
              ? role.code === "admin"
                ? "Quản trị viên luôn có toàn bộ quyền — không chỉnh."
                : "Khách hàng không có quyền quản trị."
              : `${value.size} quyền · ${role.description ?? ""}`}
          </p>
        </div>
        {!readOnly ? (
          <PermissionGate permission={PERMISSIONS.roleUpdate}>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" disabled={!dirty || replace.isPending} onClick={() => setValue(new Set(role.permissionCodes))}>
                Hoàn tác
              </Button>
              <Button size="sm" disabled={!dirty || replace.isPending} onClick={() => replace.mutate([...value])}>
                {replace.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
                Lưu bộ quyền
              </Button>
            </div>
          </PermissionGate>
        ) : null}
      </CardHeader>
      <CardContent>
        <RolePermissionTree value={value} onChange={setValue} disabled={readOnly || replace.isPending} />
      </CardContent>
    </Card>
  );
}
