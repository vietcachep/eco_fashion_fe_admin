"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminShopControllerApprove,
  adminShopControllerReject,
  adminShopControllerSuspend,
  adminShopControllerUpdateCommission,
  adminShopControllerVerifyBank,
  useAdminShopControllerGet,
  useAdminShopControllerList,
  useAdminShopViolationControllerOpenOrders,
  useShopDirectoryControllerGet,
  useShopDirectoryControllerList,
} from "@/lib/api/generated/admin-shops/admin-shops";
import type { AdminShopControllerListStatus, AdminShopSummaryResponse, ShopDirectoryItemResponse } from "@/lib/api/generated/model";
import { apiErrorCode, apiErrorMessage } from "@/lib/api-error";
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

/*
 * PLAN-0040 5.2 — xác minh tài khoản ngân hàng đang chờ (`bankStatus = pending_verification`: tên chủ TK lệch họ tên chủ shop).
 * Gửi kèm số TK ĐẦY ĐỦ quản lý đang nhìn trên màn: nếu chủ shop vừa đổi sang TK khác backend trả 409 SHOP_BANK_CHANGED_SINCE
 * (tránh xác minh nhầm TK mới) → làm mới dữ liệu để quản lý xem lại. 409 SHOP_BANK_NOT_PENDING = đã được xác minh (đồng nghiệp bấm
 * trước / bấm hai lần). Xác minh xong kỳ chi trả đang `held` của shop đổi lý do/hạn giữ → làm mới cả danh sách kỳ đối soát.
 */
const PAYOUTS_PATH = "/api/v1/admin/payouts";

export function useVerifyShopBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; bankAccountNumber?: string }) =>
      adminShopControllerVerifyBank(v.id, { bankAccountNumber: v.bankAccountNumber }),
    onSuccess: (shop) => {
      invalidateByPath(qc, PATH, PAYOUTS_PATH);
      toast.success(`Đã xác minh tài khoản ngân hàng. Chi trả của shop còn tạm giữ ${shop.bankChangeHoldHours} giờ kể từ bây giờ.`);
    },
    onError: (e) => {
      const code = apiErrorCode(e);
      if (code === "SHOP_BANK_CHANGED_SINCE") {
        invalidateByPath(qc, PATH);
        toast.warning("Chủ shop vừa đổi tài khoản ngân hàng — đã tải lại thông tin mới, hãy xem lại rồi xác minh.");
        return;
      }
      if (code === "SHOP_BANK_NOT_PENDING") {
        invalidateByPath(qc, PATH, PAYOUTS_PATH);
        toast.info("Tài khoản này không còn chờ xác minh (có thể đã được xác minh xong). Đã tải lại thông tin.");
        return;
      }
      toast.error(apiErrorMessage(e, "Xác minh tài khoản thất bại."));
    },
  });
}

/*
 * PLAN-0040 6.4 — số đơn đang mở của shop cho hộp thoại KHOÁ shop: pending/confirmed sẽ tự huỷ + hoàn tiền, packing/shipping do CSKH
 * huỷ tay. `staleTime: 0` vì con số này đổi từng phút và người quản lý quyết định dựa vào nó; hộp thoại chỉ mount khi mở nên không
 * gây request thừa.
 */
export function useShopOpenOrders(id: string) {
  return useAdminShopViolationControllerOpenOrders(id, { query: { enabled: !!id, staleTime: 0 } });
}

/*
 * Danh bạ gian hàng gọn cho các màn giám sát của sàn (cổng chọn shop): chỉ cần quyền XEM nghiệp vụ đang mở (đơn, sản phẩm, thanh toán…),
 * không cần quyền quản lý shop — nên nhân viên CSKH / kế toán cũng chọn được shop.
 */
export function useShopDirectory(params: { keyword?: string; page: number; size: number }) {
  return useShopDirectoryControllerList(
    { q: params.keyword || undefined, page: params.page, size: params.size },
    // Orval khai trang `PageResponse` không schema phần tử → ép về trang có kiểu ở đây (điểm ép kiểu duy nhất).
    { query: { select: (r) => asPage<ShopDirectoryItemResponse>(r), placeholderData: keepPreviousData, staleTime: 30_000 } },
  );
}

export function useShopDirectoryItem(id: string) {
  return useShopDirectoryControllerGet(id, { query: { enabled: !!id, staleTime: 60_000 } });
}
