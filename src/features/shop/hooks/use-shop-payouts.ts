"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useShopPayoutControllerDetailMine, useShopPayoutControllerListMine } from "@/lib/api/generated/payouts/payouts";
import type { ShopPayoutControllerListMineStatus, ShopPayoutResponse } from "@/lib/api/generated/model";
import { asPage } from "@/types/common";

/*
 * Kỳ đối soát (payout) của gian hàng CỦA CHÍNH MÌNH (vendor, quyền shop.payout.read) — chỉ đọc; sàn mới chạy kỳ /
 * chi / đánh dấu đã chi. Lỗi cổng chi đã được backend thay bằng lời nhắn chung cho vendor.
 */
export function useMyShopPayouts(params: { page: number; size: number; status?: string }) {
  return useShopPayoutControllerListMine(
    {
      page: params.page,
      size: params.size,
      status: (params.status || undefined) as ShopPayoutControllerListMineStatus | undefined,
    },
    {
      query: {
        // Orval khai response `void` → ép về trang có kiểu (điểm ép kiểu duy nhất của danh sách kỳ).
        select: (r) => asPage<ShopPayoutResponse>(r),
        placeholderData: keepPreviousData,
        staleTime: 15_000,
      },
    },
  );
}

/* Chi tiết một kỳ: tổng hợp + các dòng (đơn bán / hoàn tiền). Kỳ của shop khác → 404. */
export function useMyShopPayoutDetail(id: string | null) {
  return useShopPayoutControllerDetailMine(id ?? "", { query: { enabled: !!id, staleTime: 30_000 } });
}
