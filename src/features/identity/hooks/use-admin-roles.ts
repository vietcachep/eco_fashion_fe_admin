"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminPermissionControllerSave,
  adminRoleControllerReplace,
  useAdminPermissionControllerList,
  useAdminPermissionControllerUserOverrides,
  useAdminRoleControllerList,
} from "@/lib/api/generated/admin-roles/admin-roles";
import type { UserPermissionOverrideItem } from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import { CURRENT_USER_QUERY_KEY } from "@/features/identity/hooks/use-current-user";
import { invalidateByPath } from "@/lib/query-invalidate";

/*
 * Vai + catalog quyền + quyền cấp/chặn riêng từng người. Vai là preset (7 vai
 * hệ thống, backend sync từ catalog); admin sửa bộ quyền của vai và
 * cấp/chặn riêng cho từng nhân viên. Sau khi lưu, invalidate cả /auth/me vì
 * người đang đăng nhập có thể vừa đổi quyền của chính mình.
 */
const ROLES_PATH = "/api/v1/admin/roles";
const USER_PERMS_PATH = "/api/v1/admin/users";

export function useAdminRoles() {
  return useAdminRoleControllerList({ query: { staleTime: 60_000 } });
}

/* Toàn bộ catalog quyền (52 mã) — nhỏ, ổn định → cache lâu. */
export function usePermissionCatalog() {
  return useAdminPermissionControllerList({ query: { staleTime: 10 * 60_000 } });
}

export function useReplaceRolePermissions(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (permissionCodes: string[]) => adminRoleControllerReplace(code, { permissionCodes }),
    onSuccess: () => {
      invalidateByPath(qc, ROLES_PATH);
      qc.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
      toast.success("Đã lưu bộ quyền của vai.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Lưu bộ quyền thất bại.")),
  });
}

export function useUserOverrides(userId: string) {
  return useAdminPermissionControllerUserOverrides(userId, {
    query: { enabled: !!userId, staleTime: 30_000 },
  });
}

export function useSaveUserOverrides(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (overrides: UserPermissionOverrideItem[]) =>
      adminPermissionControllerSave(userId, { overrides }),
    onSuccess: () => {
      invalidateByPath(qc, `${USER_PERMS_PATH}/${userId}/permissions`);
      qc.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
      toast.success("Đã lưu quyền riêng.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Lưu quyền riêng thất bại.")),
  });
}
