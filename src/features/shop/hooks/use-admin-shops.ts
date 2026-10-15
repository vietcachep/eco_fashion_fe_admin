"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminShopControllerApprove,
  adminShopControllerReject,
  adminShopControllerSuspend,
  adminShopControllerUpdateCommission,
  useAdminShopControllerGet,
  useAdminShopControllerList,
} from "@/lib/api/generated/admin-shops/admin-shops";
import type { AdminShopControllerListStatus, AdminShopSummaryResponse } from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";

/*
 * Sàn quản lý gian hàng bất kỳ (quyền supplier.shop.*) — danh sách, chi tiết,
 * duyệt / mở khoá / khoá / từ chối / sửa hoa hồng.
 */
const PATH = "/api/v1/admin/shops";

export function useAdminShops(params: { status?: string; keyword?: string; page: number; size: number }) {
  return useAdminShopControllerList(
    {
      status: (params.status || undefined) as AdminShopControllerListStatus | undefined,
      q: params.keyword || undefined,
      page: params.page,
      size: params.size,
    },
    {
      query: {
        select: (r) => asPage<AdminShopSummaryResponse>(r),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
      },
    },
  );
}

/*
 * Danh sách rút gọn (id, tên, mã) tối đa 100 shop — để dịch `shopId` → tên ở các bảng mà
 * API trả thiếu tên (kỳ đối soát) và dựng ô chọn shop. Hàm `select` khai ở mức module để
 * tham chiếu ổn định, không tính lại mỗi lần render.
 */
export interface ShopOption {
  id: string;
  name: string;
  code: string;
}

const toShopOptions = (r: unknown): ShopOption[] => asPage<AdminShopSummaryResponse>(r).content.map(({ id, name, code }) => ({ id, name, code }));

export function useAdminShopOptions() {
  return useAdminShopControllerList({ page: 1, size: 100 }, { query: { select: toShopOptions, staleTime: 5 * 60_000 } });
}

/* Chi tiết dành cho sàn: có thêm số tài khoản ngân hàng ĐẦY ĐỦ (`bankAccountNumber`). */
export function useAdminShop(id: string) {
  return useAdminShopControllerGet(id, { query: { enabled: !!id, staleTime: 15_000 } });
}

export function useApproveShop() {
  const qc = useQueryClient();
  return useMutation({
    // `unlock` chỉ đổi câu thông báo: backend dùng chung một endpoint cho duyệt (pending) và mở khoá (suspended).
    mutationFn: (v: { id: string; unlock?: boolean }) => adminShopControllerApprove(v.id),
    onSuccess: (_r, v) => {
      invalidateByPath(qc, PATH);
      toast.success(v.unlock ? "Đã mở khoá gian hàng." : "Đã duyệt gian hàng.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Duyệt gian hàng thất bại.")),
  });
}

export function useSuspendShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; reason: string }) => adminShopControllerSuspend(v.id, { reason: v.reason }),
    onSuccess: () => {
      invalidateByPath(qc, PATH);
      toast.success("Đã khoá gian hàng.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Khoá gian hàng thất bại.")),
  });
}

export function useRejectShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; reason: string }) => adminShopControllerReject(v.id, { reason: v.reason }),
    onSuccess: () => {
      invalidateByPath(qc, PATH);
      toast.success("Đã từ chối gian hàng.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Từ chối gian hàng thất bại.")),
  });
}

export function useUpdateShopCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; commissionRate: number }) =>
      adminShopControllerUpdateCommission(v.id, { commissionRate: v.commissionRate }),
    onSuccess: () => {
      invalidateByPath(qc, PATH);
      toast.success("Đã lưu tỉ lệ hoa hồng (áp dụng cho đơn mới).");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Lưu hoa hồng thất bại.")),
  });
}
