"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  shopPayoutControllerSetAutoSetting,
  useShopPayoutControllerAutoSettings,
} from "@/lib/api/generated/payouts/payouts";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";

/*
 * Công tắc chi trả TỰ ĐỘNG theo từng shop (PLAN-0046). Xem cần `supplier.payout.read`, bật/tắt cần `supplier.payout.process`.
 * Tắt chỉ chặn cron 02:00 — kế toán vẫn chạy kỳ tay (chọn shop) để chi ngay cho shop đang tắt. Prefix `/admin/payouts` phủ cả
 * danh sách này lẫn danh sách kỳ.
 */
const PATH = "/api/v1/admin/payouts";

/* Các shop đã duyệt kèm trạng thái tự động (mặc định bật). Dùng cho panel bật/tắt và ô chọn shop của hộp thoại chạy kỳ. */
export function usePayoutAutoSettings(enabled = true) {
  return useShopPayoutControllerAutoSettings({ query: { enabled, staleTime: 30_000 } });
}

export function useSetPayoutAuto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ shopId, enabled }: { shopId: string; enabled: boolean }) => shopPayoutControllerSetAutoSetting(shopId, { enabled }),
    onSuccess: (r) => {
      invalidateByPath(qc, PATH);
      toast.success(r.autoEnabled ? `Đã bật chi trả tự động cho ${r.shopName}.` : `Đã tắt chi trả tự động cho ${r.shopName} — chỉ chi khi chạy tay.`);
    },
    onError: (e) => {
      invalidateByPath(qc, PATH);
      toast.error(apiErrorMessage(e, "Không đổi được công tắc chi trả tự động."));
    },
  });
}
