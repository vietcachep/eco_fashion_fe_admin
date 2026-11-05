"use client";

import { keepPreviousData } from "@tanstack/react-query";
import {
  useAdminShopViolationControllerList,
  useAdminShopViolationControllerSummary,
} from "@/lib/api/generated/admin-shops/admin-shops";
import { useShopViolationControllerList, useShopViolationControllerSummary } from "@/lib/api/generated/shop-orders/shop-orders";
import type { ShopViolation } from "@/features/shop/types/violation";
import { asPage } from "@/types/common";

/*
 * Điểm vi phạm xử lý đơn của gian hàng (PLAN-0027 §2.1: quá hạn xác nhận/giao, huỷ vì hết hàng/sai giá/đã đóng gói, từ chối
 * yêu cầu huỷ rồi tự huỷ). Hai cặp hook cùng khuôn dữ liệu:
 *  - vendor (quyền shop.order.read): shop của CHÍNH MÌNH, suy từ phiên — `GET /shop/violations[/summary]`;
 *  - sàn (quyền supplier.shop.read): shop bất kỳ theo id — `GET /admin/shops/{id}/violations[/summary]`.
 * Orval khai danh sách là `PageResponse` không schema phần tử → ép về trang có kiểu ở đây (điểm ép kiểu duy nhất).
 * Điểm đổi theo job SLA/huỷ đơn, không cần thời gian thực: staleTime 30 giây.
 */
const STALE = 30_000;

export function useMyShopViolations(params: { page: number; size: number }) {
  return useShopViolationControllerList(params, {
    query: { select: (r) => asPage<ShopViolation>(r), placeholderData: keepPreviousData, staleTime: STALE },
  });
}

export function useMyShopViolationSummary() {
  return useShopViolationControllerSummary({ query: { staleTime: STALE } });
}

export function useAdminShopViolations(shopId: string, params: { page: number; size: number }) {
  return useAdminShopViolationControllerList(shopId, params, {
    query: { enabled: !!shopId, select: (r) => asPage<ShopViolation>(r), placeholderData: keepPreviousData, staleTime: STALE },
  });
}

export function useAdminShopViolationSummary(shopId: string) {
  return useAdminShopViolationControllerSummary(shopId, { query: { enabled: !!shopId, staleTime: STALE } });
}
