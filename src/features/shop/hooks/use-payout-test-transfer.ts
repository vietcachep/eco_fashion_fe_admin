"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  shopPayoutControllerTestTransfer,
  shopPayoutControllerTestTransferStatus,
  useShopPayoutControllerTestTransferConfig,
} from "@/lib/api/generated/payouts/payouts";
import type { TestTransferRequest } from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";

/*
 * Công cụ THỬ CHI TỰ ĐỘNG (PLAN-0046): chuyển TIỀN THẬT từ tài khoản chi PayOS tới tài khoản nhập tay để kiểm tra luồng chi.
 * Quyền supplier.payout.approve; backend chỉ cho khi tham số payout.test_enabled bật, số tiền ≤ payout.test_max_amount và quỹ chi đủ.
 * Không toast lỗi ở đây: màn hiện lỗi ngay trong thẻ vì lý do (tắt/chưa cấu hình/thiếu số dư) cần đọc kỹ và dài.
 */
const PATH = "/api/v1/admin/payouts";

export function useTestTransferConfig(enabled = true) {
  return useShopPayoutControllerTestTransferConfig({ query: { enabled, staleTime: 15_000 } });
}

export function useTestTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TestTransferRequest) => shopPayoutControllerTestTransfer(body),
    // Làm mới số dư quỹ chi sau khi gửi (cả khi lỗi: có thể tiền đã đi).
    onSettled: () => invalidateByPath(qc, PATH),
  });
}

/* Tra trạng thái một lệnh theo mã lệnh PayOS — gọi tay (không polling) khi người dùng bấm "Kiểm tra trạng thái". */
export function useCheckTestTransfer() {
  return useMutation({ mutationFn: (id: string) => shopPayoutControllerTestTransferStatus({ id }) });
}

export const testTransferErrorMessage = (e: unknown) => apiErrorMessage(e, "Không gửi được lệnh thử chi.");
