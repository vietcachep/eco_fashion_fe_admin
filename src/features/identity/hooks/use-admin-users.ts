"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminUserControllerCreateStaff,
  adminUserControllerResetPassword,
  adminUserControllerSetStatus,
  adminUserControllerUpdate,
  useAdminUserControllerGet,
  useAdminUserControllerList,
} from "@/lib/api/generated/admin-users/admin-users";
import type {
  CreateStaffRequest,
  SetUserStatusRequest,
  UpdateUserByAdminRequest,
  UserProfileResponse,
} from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";

/*
 * Người dùng (nhân viên + khách) — bọc hook Orval tag admin-users. Danh sách
 * phân trang/lọc ở server (Rule 1); `keepPreviousData` giữ bảng ổn định khi
 * sang trang. Component dùng các hook này, không dùng hook sinh trực tiếp.
 */
const USERS_PATH = "/api/v1/admin/users";

export interface AdminUsersQuery {
  keyword?: string;
  roleCode?: string;
  status?: string;
  staffOnly?: boolean;
  page: number;
  size: number;
}

export function useAdminUsers({ keyword, roleCode, status, staffOnly, page, size }: AdminUsersQuery) {
  return useAdminUserControllerList(
    {
      q: keyword || undefined,
      roleCode: roleCode || undefined,
      status: (status || undefined) as never,
      staffOnly: staffOnly || undefined,
      page,
      size,
    },
    {
      query: {
        select: (res) => asPage<UserProfileResponse>(res),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
      },
    },
  );
}

export function useAdminUser(id: string) {
  return useAdminUserControllerGet(id, { query: { enabled: !!id, staleTime: 30_000 } });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateStaffRequest) => adminUserControllerCreateStaff(body),
    onSuccess: () => {
      invalidateByPath(qc, USERS_PATH);
      toast.success("Đã tạo tài khoản nhân viên.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Tạo tài khoản thất bại.")),
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateUserByAdminRequest) => adminUserControllerUpdate(id, body),
    onSuccess: () => {
      invalidateByPath(qc, USERS_PATH);
      toast.success("Đã cập nhật hồ sơ.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Cập nhật thất bại.")),
  });
}

/* Khoá / mở khoá tài khoản (PUT /admin/users/{id}/status). */
export function useSetUserStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SetUserStatusRequest) => adminUserControllerSetStatus(id, body),
    onSuccess: (_r, body) => {
      invalidateByPath(qc, USERS_PATH);
      toast.success(body.status === "locked" ? "Đã khoá tài khoản." : "Đã mở khoá tài khoản.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Đổi trạng thái thất bại.")),
  });
}

export function useAdminResetPassword(id: string) {
  return useMutation({
    mutationFn: (newPassword: string) => adminUserControllerResetPassword(id, { newPassword }),
    onSuccess: () => toast.success("Đã đặt lại mật khẩu, mọi phiên của người này bị thu hồi."),
    onError: (e) => toast.error(apiErrorMessage(e, "Đặt lại mật khẩu thất bại.")),
  });
}
