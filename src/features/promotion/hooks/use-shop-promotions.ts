"use client";

import { keepPreviousData, useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  shopPromotionControllerCreate,
  shopPromotionControllerRemove,
  shopPromotionControllerUpdate,
  useShopPromotionControllerGet,
  useShopPromotionControllerList,
  useShopPromotionControllerUsages,
} from "@/lib/api/generated/shop-promotions/shop-promotions";
import {
  getShopProductControllerGetQueryOptions,
  useShopCatalogControllerLeaves,
  useShopProductControllerList,
} from "@/lib/api/generated/shops/shops";
import type { CreatePromotionRequest, PromotionForm } from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";
import type { PromotionAdminResponse, PromotionUsageRow, ShopProductOption } from "@/features/promotion/types/promotion";

/*
 * Mã giảm giá của GIAN HÀNG mình (cổng vendor, /shop/promotions/**). shopId do
 * backend suy từ ngữ cảnh shop nên không có tham số shop nào ở đây; mã của shop
 * khác trả 404. Mã scope=shop do shop chịu chi phí, chỉ áp cho đơn con của shop.
 */
const PATH = "/api/v1/shop/promotions";

export function useShopPromotions(params: { keyword?: string; active?: boolean; page: number; size: number }) {
  return useShopPromotionControllerList(
    { q: params.keyword || undefined, active: params.active, page: params.page, size: params.size },
    {
      query: {
        select: (r) => asPage<PromotionAdminResponse>(r),
        placeholderData: keepPreviousData,
        staleTime: 15_000,
      },
    },
  );
}

export function useShopPromotion(id: string) {
  return useShopPromotionControllerGet(id, {
    query: { enabled: !!id, select: (r) => r as unknown as PromotionAdminResponse, staleTime: 15_000 },
  });
}

/* Lượt dùng của mã — backend ẩn danh khách với vendor (userId luôn null). */
export function useShopPromotionUsages(id: string, params: { page: number; size: number }) {
  return useShopPromotionControllerUsages(id, params, {
    query: {
      enabled: !!id,
      select: (r) => asPage<PromotionUsageRow>(r),
      placeholderData: keepPreviousData,
      staleTime: 30_000,
    },
  });
}

/*
 * Tạo / sửa KHÔNG toast lỗi: form hiện lỗi ngay tại field (mã trùng
 * PROMOTION_CODE_EXISTS → ô "Mã") hoặc khung lỗi đầu form (PROMOTION_INVALID…).
 */
export function useCreateShopPromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreatePromotionRequest) => (await shopPromotionControllerCreate(body)) as unknown as PromotionAdminResponse,
    onSuccess: () => {
      invalidateByPath(qc, PATH);
      toast.success("Đã tạo mã giảm giá.");
    },
  });
}

export function useUpdateShopPromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: PromotionForm }) =>
      (await shopPromotionControllerUpdate(id, body)) as unknown as PromotionAdminResponse,
    onSuccess: () => {
      invalidateByPath(qc, PATH);
      toast.success("Đã lưu mã giảm giá.");
    },
  });
}

/* Bật / tắt nhanh ở danh sách — PATCH chỉ gửi `isActive` (mọi trường của PromotionForm đều tuỳ chọn). */
export function useToggleShopPromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => shopPromotionControllerUpdate(id, { isActive }),
    onSuccess: (_r, v) => {
      invalidateByPath(qc, PATH);
      toast.success(v.isActive ? "Đã bật mã giảm giá." : "Đã tắt mã giảm giá.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Đổi trạng thái thất bại.")),
  });
}

/* Xoá mềm: mã biến mất khỏi web, đơn đã dùng vẫn giữ mức giảm. */
export function useRemoveShopPromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shopPromotionControllerRemove(id),
    onSuccess: () => {
      invalidateByPath(qc, PATH);
      toast.success("Đã xoá mã giảm giá.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Xoá thất bại.")),
  });
}

/*
 * Nguồn chọn phạm vi cho form vendor. Ngành: chỉ ngành LÁ shop đang được bán
 * (/shop/catalog/categories/leaves) — gợi ý đúng ngành, không lộ cả cây danh mục
 * của sàn. Sản phẩm: tìm trong chính kho sản phẩm của shop.
 */
export function useShopCategoryLeaves() {
  return useShopCatalogControllerLeaves({ query: { staleTime: 10 * 60_000 } });
}

export function useShopProductSearch(keyword: string) {
  return useShopProductControllerList(
    { q: keyword || undefined, page: 1, pageSize: 8 },
    {
      query: {
        select: (r) => asPage<ShopProductOption>(r).content,
        placeholderData: keepPreviousData,
        staleTime: 30_000,
      },
    },
  );
}

/* Tên sản phẩm theo id cho các mục đã chọn (mã đang sửa chỉ lưu id) — trả Map id → tên, id chưa tải xong thì chưa có khoá. */
export function useShopProductNames(ids: string[]) {
  return useQueries({
    queries: ids.map((id) =>
      getShopProductControllerGetQueryOptions(id, { query: { staleTime: 5 * 60_000, retry: false } }),
    ),
    combine: (results) => new Map(results.flatMap((r, i) => (r.data ? [[ids[i], r.data.name] as const] : []))),
  });
}
