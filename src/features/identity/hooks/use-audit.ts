"use client";

import { keepPreviousData } from "@tanstack/react-query";
import {
  useAdminAuditControllerList,
  useLoginHistoryControllerList,
} from "@/lib/api/generated/admin-audit/admin-audit";
import { asPage } from "@/types/common";
import type { AuditLogResponse, LoginHistoryResponse } from "@/features/identity/types/identity";

/* Nhật ký thao tác identity + lịch sử đăng nhập — chỉ đọc, phân trang server. */
export function useAuditLogs(params: {
  page: number;
  size: number;
  action?: string;
  entityType?: string;
  actorUserId?: string;
}) {
  return useAdminAuditControllerList(
    {
      page: params.page,
      size: params.size,
      action: params.action || undefined,
      entityType: params.entityType || undefined,
      actorUserId: params.actorUserId || undefined,
    },
    {
      query: {
        select: (r) => asPage<AuditLogResponse>(r),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
      },
    },
  );
}

export function useLoginHistories(params: {
  page: number;
  size: number;
  email?: string;
  success?: boolean;
}) {
  return useLoginHistoryControllerList(
    {
      page: params.page,
      size: params.size,
      email: params.email || undefined,
      success: params.success,
    },
    {
      query: {
        select: (r) => asPage<LoginHistoryResponse>(r),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
      },
    },
  );
}
