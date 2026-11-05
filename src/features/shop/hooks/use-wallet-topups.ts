"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { customInstance } from "@/lib/api/mutator";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";
import { OPEN_TOPUP_STATUSES } from "@/features/shop/types/wallet-topup";
import type { CreateTopupResult, TopupStatus, WalletTopup, WalletTopupDetail } from "@/features/shop/types/wallet-topup";

/*
 * Nạp cọc ví qua PayOS (PLAN-0041). Gọi thẳng qua mutator như use-wallet.ts vì client Orval sinh từ spec chưa có
 * các route /topups; sau `npm run api:sync` có thể đổi sang hook sinh ra (giữ nguyên tên hook ở đây).
 * Vendor: /shop/wallet/topups* (shopId lấy từ ngữ cảnh shop, BE bỏ qua shopId gửi lên từ client).
 * Sàn: /admin/wallet-topups* (chỉ xem; duyệt tay không áp dụng cho khoản PayOS).
 */
const SHOP_PATH = "/api/v1/shop/wallet";
const ADMIN_TOPUP_PATH = "/api/v1/admin/wallet-topups";

/* Trạng thái cuối: số dư ví có thể vừa đổi (ghi có hoặc đóng khoản) nên cần làm mới cache ví. */
const TERMINAL_TOPUP_STATUSES: readonly TopupStatus[] = ["paid", "expired", "cancelled", "failed"];

/*
 * Trang quay lại từ PayOS chỉ cần hỏi nhanh ngay sau khi chủ shop thanh toán: 3 giây/lần, tối đa 180 giây tính từ lúc
 * mở trang. Quá cửa sổ này thì để job đối soát phía BE dò PayOS, không dồn gọi API khi trang bị bỏ mở.
 */
const POLL_INTERVAL_MS = 3_000;
const POLL_WINDOW_MS = 180_000;

const get = <T>(url: string, params?: Record<string, unknown>) => customInstance<T>({ url, method: "GET", params });
const post = <T>(url: string, data?: unknown) => customInstance<T>({ url, method: "POST", data });

const isOpen = (status: TopupStatus | undefined) => !!status && OPEN_TOPUP_STATUSES.includes(status);

// ---------------------------------------------------------------- vendor

/* Tạo link nạp cọc. `amount` là chuỗi số nguyên VND. Khoản còn mở thì BE trả lại khoản đó (`reused: true`). */
export function useCreateTopup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amount: string) => post<CreateTopupResult>(`${SHOP_PATH}/topups`, { amount }),
    onSuccess: () => {
      invalidateByPath(qc, SHOP_PATH);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Không tạo được lần nạp tiền. Vui lòng thử lại.")),
  });
}

/* Lịch sử nạp cọc của shop, mới nhất trước. `page` bắt đầu từ 1 (quy ước của backend). */
export function useMyTopups(page: number, size: number, status?: string) {
  const url = `${SHOP_PATH}/topups`;
  const params = { page, size, status: status || undefined };
  return useQuery({
    queryKey: [url, params],
    queryFn: () => get<unknown>(url, params),
    select: (r) => asPage<WalletTopup>(r),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

/* Một khoản theo id. `staleTime: 0` vì dữ liệu có thể đổi ngay sau khi PayOS ghi có. */
export function useMyTopup(id: string | null) {
  const url = `${SHOP_PATH}/topups/${id ?? ""}`;
  return useQuery({
    queryKey: [url],
    queryFn: () => get<WalletTopup>(url),
    enabled: !!id,
    staleTime: 0,
  });
}

/*
 * Trang quay lại từ PayOS tra theo mã PayOS (`orderCode`). Khi khoản còn mở thì hỏi lại 3 giây/lần trong cửa sổ
 * POLL_WINDOW_MS; khi chuyển sang trạng thái cuối thì làm mới cache ví để số dư hiện đúng.
 */
export function useMyTopupByOrderCode(orderCode: string | null) {
  const qc = useQueryClient();
  // Mốc mount của hook để tính cửa sổ polling; khởi tạo một lần, không đổi theo các lần render sau.
  const [startedAt] = useState(() => Date.now());
  const url = `${SHOP_PATH}/topups/by-order-code/${orderCode ?? ""}`;

  const query = useQuery({
    queryKey: [url],
    queryFn: () => get<WalletTopup>(url),
    enabled: !!orderCode,
    // Sai mã hoặc khoản của shop khác thì BE trả 404; thử lại chỉ làm chậm trang.
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchInterval: (q) =>
      isOpen(q.state.data?.status) && Date.now() - startedAt < POLL_WINDOW_MS ? POLL_INTERVAL_MS : false,
  });

  const status = query.data?.status;
  useEffect(() => {
    // Effect chỉ chạy khi status đổi, nên không lặp lại việc làm mới dù query làm mới chính nó (prefix SHOP_PATH).
    if (status && TERMINAL_TOPUP_STATUSES.includes(status)) invalidateByPath(qc, SHOP_PATH);
  }, [status, qc]);

  return query;
}

/* Huỷ link đang mở (pending|partial). BE gọi huỷ link PayOS sau khi commit (best-effort); phần tiền đã ghi có vào ví vẫn được giữ. */
export function useCancelTopup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<WalletTopup>(`${SHOP_PATH}/topups/${id}/cancel`),
    onSuccess: () => {
      invalidateByPath(qc, SHOP_PATH);
      toast.success("Đã huỷ lần nạp tiền.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Huỷ lần nạp tiền thất bại.")),
  });
}

// ---------------------------------------------------------------- sàn

/* Danh sách khoản nạp PayOS của mọi shop (sàn chỉ xem). `page` bắt đầu từ 1. */
export function useAdminTopups(params: { status?: string; page: number; size: number }) {
  return useQuery({
    queryKey: [ADMIN_TOPUP_PATH, params],
    queryFn: () =>
      get<unknown>(ADMIN_TOPUP_PATH, { status: params.status || undefined, page: params.page, size: params.size }),
    select: (r) => asPage<WalletTopup>(r),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

/* Chi tiết khoản nạp kèm các lần ghi có (sàn). */
export function useAdminTopup(id: string | null) {
  const url = `${ADMIN_TOPUP_PATH}/${id ?? ""}`;
  return useQuery({
    queryKey: [url],
    queryFn: () => get<WalletTopupDetail>(url),
    enabled: !!id,
  });
}
