"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  shopPayoutControllerApprove,
  shopPayoutControllerMarkPaid,
  shopPayoutControllerReconcile,
  shopPayoutControllerRelease,
  shopPayoutControllerRetry,
  shopPayoutControllerRun,
  useShopPayoutControllerDetail,
  useShopPayoutControllerList,
  useShopPayoutControllerPayosBalance,
} from "@/lib/api/generated/payouts/payouts";
import type {
  MarkPaidRequest,
  RunPayoutRequest,
  ShopPayoutControllerListStatus,
  ShopPayoutResponse,
} from "@/lib/api/generated/model";
import { apiErrorCode, apiErrorMessage, apiMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";

/*
 * Đối soát (payout) của MỌI shop (quyền supplier.payout.read / process / approve): xem kỳ,
 * chạy kỳ, duyệt kỳ vượt hạn mức, đối chiếu PayOS, mở giữ, gửi lại lệnh chi, đánh dấu đã chi.
 * Prefix `/admin/payouts` phủ cả danh sách, chi tiết, số dư PayOS lẫn lệnh giữ tay
 * (`/admin/payouts/holds`) — mọi thao tác ở đây đều có thể đổi những thứ đó.
 */
const PATH = "/api/v1/admin/payouts";

export function useAdminPayouts(params: { status?: string; shopId?: string; page: number; size: number }) {
  return useShopPayoutControllerList(
    {
      status: (params.status || undefined) as ShopPayoutControllerListStatus | undefined,
      shopId: params.shopId || undefined,
      page: params.page,
      size: params.size,
    },
    {
      query: {
        select: (r) => asPage<ShopPayoutResponse>(r),
        placeholderData: keepPreviousData,
        staleTime: 15_000,
      },
    },
  );
}

export function useAdminPayoutDetail(id: string) {
  return useShopPayoutControllerDetail(id, { query: { enabled: !!id, staleTime: 10_000 } });
}

/* Số dư tài khoản chi PayOS; `configured: false` ⇒ chưa có khoá lệnh chi, kế toán chuyển tay. */
export function usePayosBalance() {
  return useShopPayoutControllerPayosBalance({ query: { staleTime: 60_000 } });
}

/*
 * Chạy kỳ đối soát toàn sàn (idempotent). Trả danh sách kỳ vừa tạo để dialog hiện
 * tóm tắt nên KHÔNG toast thành công ở đây; lỗi nghiệp vụ (PAYOUT_PERIOD_OVERLAP,
 * PAYOUT_INVALID_PERIOD…) → toast tiếng Việt từ backend.
 */
export function useRunPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RunPayoutRequest) => shopPayoutControllerRun(body),
    onSuccess: () => invalidateByPath(qc, PATH),
    onError: (e) => toast.error(apiErrorMessage(e, "Chạy kỳ đối soát thất bại.")),
  });
}

/*
 * Các thao tác trên MỘT kỳ KHÔNG toast lỗi: khung chi tiết kỳ hiện lỗi cố định ngay trên đầu (lý do 409 như PAYOUT_STILL_HELD
 * dài và cần đọc kỹ — toast tự tắt sẽ mất). Lỗi nào cũng làm mới dữ liệu vì thường do kỳ vừa đổi trạng thái (job / đồng nghiệp).
 */

/* Gửi lại lệnh chi — CHỈ kỳ `failed` hoặc `pending` đã có khoá; kỳ processing/unknown bị 409 (dùng "Đối chiếu PayOS"). */
export function useRetryPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shopPayoutControllerRetry(id),
    onSuccess: () => {
      invalidateByPath(qc, PATH);
      toast.success("Đã gửi lại lệnh chi.");
    },
    onError: () => invalidateByPath(qc, PATH),
  });
}

/* Duyệt kỳ `awaiting_approval` (vượt hạn mức tự chi) ⇒ backend gửi PayOS. 409 PAYOUT_NOT_APPROVABLE khi kỳ đã đổi trạng thái. */
export function useApprovePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shopPayoutControllerApprove(id),
    onSuccess: () => {
      invalidateByPath(qc, PATH);
      toast.success("Đã duyệt kỳ chi — lệnh chi đã gửi PayOS.");
    },
    onError: () => invalidateByPath(qc, PATH),
  });
}

/*
 * Hỏi PayOS kết quả lệnh chi của kỳ processing/unknown. Backend trả kỳ sau đối chiếu: so với trạng thái TRƯỚC khi bấm để báo
 * đúng điều đã xảy ra (kỳ có thể giữ nguyên nếu PayOS chưa có kết quả cuối).
 */
export function useReconcilePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payout: Pick<ShopPayoutResponse, "id" | "status">) =>
      shopPayoutControllerReconcile(payout.id).then((after) => ({ before: payout.status, after })),
    onSuccess: ({ before, after }) => {
      invalidateByPath(qc, PATH);
      if (after.status === "paid") toast.success("PayOS xác nhận lệnh chi đã chuyển tiền — kỳ chuyển sang \"Đã chi\".");
      else if (after.status === "failed") toast.warning("PayOS báo lệnh chi không thành công — kỳ chuyển sang \"Chi lỗi\", có thể thử lại.");
      else if (after.status === before) toast.info("PayOS chưa có kết quả cuối — kỳ giữ nguyên. Thử lại sau ít phút.");
      else toast.info("Đã đối chiếu với PayOS — kỳ đã được cập nhật.");
    },
    onError: () => invalidateByPath(qc, PATH),
  });
}

/* Mở giữ kỳ `held`. Còn lý do giữ ⇒ 409 PAYOUT_STILL_HELD kèm lý do — hiện NGUYÊN câu của backend (xem `payoutActionError`). */
export function useReleasePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shopPayoutControllerRelease(id),
    onSuccess: () => {
      invalidateByPath(qc, PATH);
      toast.success("Đã mở giữ kỳ chi.");
    },
    onError: () => invalidateByPath(qc, PATH),
  });
}

/* Thân đánh dấu đã chi: tách khỏi mutation để dialog có kiểu rõ (id + 3 trường của MarkPaidRequest). */
export type MarkPayoutPaidInput = { id: string } & MarkPaidRequest;

/*
 * Đánh dấu đã chi TAY. Kỳ processing/unknown phải gửi `confirmGatewayNotExecuted: true` (kế toán đã tra bảng điều khiển PayOS: lệnh
 * KHÔNG được thực hiện) — nếu không backend trả 409 PAYOUT_GATEWAY_NOT_CONFIRMED. Lỗi hiện trong hộp thoại (không toast) vì hai mã 409
 * cần chỉ đúng ô phải sửa.
 */
export function useMarkPayoutPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: MarkPayoutPaidInput) =>
      shopPayoutControllerMarkPaid(v.id, {
        providerRef: v.providerRef,
        note: v.note || undefined,
        // Chỉ gửi khi đúng là true: kỳ failed/pending không cần cờ này.
        confirmGatewayNotExecuted: v.confirmGatewayNotExecuted ? true : undefined,
      }),
    onSuccess: () => {
      invalidateByPath(qc, PATH);
      toast.success("Đã đánh dấu đã chi.");
    },
    onError: () => invalidateByPath(qc, PATH),
  });
}

/*
 * Câu lỗi hiện cho người dùng khi một thao tác trên kỳ bị từ chối. Lý do 409 của backend giữ NGUYÊN (PAYOUT_STILL_HELD: "Chưa mở giữ
 * được: <lý do>" — kế toán cần đúng lý do để biết phải chờ gì / xử lý gì); chỉ hai mã của đánh dấu tay được viết lại cho rõ việc phải làm.
 */
export function payoutActionError(error: unknown, fallback: string): string {
  switch (apiErrorCode(error)) {
    case "PAYOUT_GATEWAY_NOT_CONFIRMED":
      return "Lệnh chi PayOS của kỳ này có thể đã hoặc đang được thực hiện. Hãy bấm \"Đối chiếu PayOS\" trước; chỉ đánh dấu tay khi đã tra bảng điều khiển PayOS và chắc chắn lệnh KHÔNG được thực hiện (tick ô xác nhận).";
    case "PAYOUT_PROVIDER_REF_DUPLICATE":
      return "Mã giao dịch / chứng từ này đã được dùng cho một kỳ chi khác (mỗi mã chỉ dùng một lần trên toàn hệ thống). Kiểm tra lại mã hoặc nhập mã khác.";
    default:
      return apiMessage(error) ?? fallback;
  }
}
