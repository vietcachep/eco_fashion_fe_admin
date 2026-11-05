"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  shopPayoutControllerCreateHold,
  shopPayoutControllerReleaseHold,
  useShopPayoutControllerListHolds,
} from "@/lib/api/generated/payouts/payouts";
import type { CreatePayoutHoldRequest, ShopPayoutControllerListHoldsParams } from "@/lib/api/generated/model";
import { apiErrorCode, apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";

/*
 * Lệnh GIỮ TAY tiền chi trả của một shop (PLAN-0026 §2.4). Quyền xem: supplier.payout.read; tạo / mở: supplier.payout.process.
 * Giữ tay đổi cả danh sách kỳ (kỳ pending/awaiting_approval chuyển `held`; mở giữ đẩy kỳ đi tiếp) nên làm mới theo prefix
 * `/admin/payouts` — phủ cả `/admin/payouts/holds`, danh sách và chi tiết kỳ.
 */
const PATH = "/api/v1/admin/payouts";

/*
 * `shopId` có ⇒ LỊCH SỬ lệnh giữ của shop (cả lệnh đã mở); bỏ trống ⇒ các lệnh ĐANG hiệu lực toàn sàn. Spec Swagger khai `shopId`
 * bắt buộc dù backend cho bỏ trống nên ép kiểu tham số ở đây — điểm ép kiểu DUY NHẤT của danh sách lệnh giữ.
 */
export function usePayoutHolds(shopId?: string) {
  const params = { shopId: shopId || undefined } as unknown as ShopPayoutControllerListHoldsParams;
  return useShopPayoutControllerListHolds(params, { query: { staleTime: 15_000 } });
}

/* Tạo lệnh giữ. Mỗi shop một lệnh đang hiệu lực: trùng ⇒ 409 PAYOUT_HOLD_EXISTS (nói rõ việc phải làm: mở lệnh cũ trước). */
export function useCreatePayoutHold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePayoutHoldRequest) => shopPayoutControllerCreateHold(body),
    onSuccess: () => {
      invalidateByPath(qc, PATH);
      toast.success("Đã giữ tiền chi trả của gian hàng.");
    },
    onError: (e) => {
      invalidateByPath(qc, PATH);
      toast.error(
        apiErrorCode(e) === "PAYOUT_HOLD_EXISTS"
          ? "Gian hàng này đã có lệnh giữ đang hiệu lực — mở lệnh cũ trước khi tạo lệnh mới."
          : apiErrorMessage(e, "Không tạo được lệnh giữ."),
      );
    },
  });
}

/* Mở lệnh giữ ⇒ các kỳ `held` của shop không còn lý do giữ nào khác được đẩy tiếp; kỳ còn lý do khác (shop bị khoá / đổi TK) vẫn giữ. */
export function useReleasePayoutHold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shopPayoutControllerReleaseHold(id),
    onSuccess: (r) => {
      invalidateByPath(qc, PATH);
      toast.success(r.releasedPayouts > 0 ? `Đã mở lệnh giữ — ${r.releasedPayouts} kỳ chi được đi tiếp.` : "Đã mở lệnh giữ.");
    },
    onError: (e) => {
      invalidateByPath(qc, PATH);
      toast.error(apiErrorMessage(e, "Không mở được lệnh giữ."));
    },
  });
}
