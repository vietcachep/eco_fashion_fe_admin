"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminPromotionControllerCreate,
  adminPromotionControllerRemove,
  adminPromotionControllerUpdate,
  useAdminPromotionControllerGet,
  useAdminPromotionControllerList,
  useAdminPromotionControllerUsages,
} from "@/lib/api/generated/admin-promotions/admin-promotions";
import type { CreatePromotionRequest, PromotionForm } from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";
import type { PromotionAdminResponse, PromotionUsageRow } from "@/features/promotion/types/promotion";

/* Mã khuyến mãi (%, số tiền, freeship) + lượt dùng theo đơn. */
const PATH = "/api/v1/admin/promotions";

export function useAdminPromotions(params: { keyword?: string; active?: boolean; page: number; size: number }) {
  return useAdminPromotionControllerList(
    { q: params.keyword || undefined, active: params.active, page: params.page, size: params.size },
    {
      query: {
        select: (r) => asPage<PromotionAdminResponse>(r),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
      },
    },
  );
}

export function useAdminPromotion(id: string) {
  return useAdminPromotionControllerGet(id, {
    query: { enabled: !!id, select: (r) => r as unknown as PromotionAdminResponse, staleTime: 15_000 },
  });
}

export function usePromotionUsages(id: string, params: { page: number; size: number }) {
  return useAdminPromotionControllerUsages(id, params, {
    query: {
      enabled: !!id,
      select: (r) => asPage<PromotionUsageRow>(r),
      placeholderData: keepPreviousData,
      staleTime: 30_000,
    },
  });
}

function usePromotionMutation<TVars, TRes>(fn: (v: TVars) => Promise<TRes>, success: string, failure: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      invalidateByPath(qc, PATH, "/api/v1/promotions");
      toast.success(success);
    },
    onError: (e) => toast.error(apiErrorMessage(e, failure)),
  });
}

export function useCreatePromotion() {
  return usePromotionMutation(
    async (body: CreatePromotionRequest) => (await adminPromotionControllerCreate(body)) as unknown as PromotionAdminResponse,
    "Đã tạo mã khuyến mãi.",
    "Tạo mã thất bại — mã đã tồn tại?",
  );
}

export function useUpdatePromotion(id: string) {
  return usePromotionMutation(
    (body: PromotionForm) => adminPromotionControllerUpdate(id, body),
    "Đã lưu mã khuyến mãi.",
    "Lưu thất bại.",
  );
}

export function useRemovePromotion() {
  return usePromotionMutation((id: string) => adminPromotionControllerRemove(id), "Đã xoá mã khuyến mãi.", "Xoá thất bại.");
}
