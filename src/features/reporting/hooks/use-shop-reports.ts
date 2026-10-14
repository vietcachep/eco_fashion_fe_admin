"use client";

import { keepPreviousData } from "@tanstack/react-query";
import {
  useShopReportingControllerDashboard,
  useShopReportingControllerLowStock,
  useShopReportingControllerRevenue,
  useShopReportingControllerTop,
} from "@/lib/api/generated/shop-reports/shop-reports";
import { useShopWalletControllerSummary } from "@/lib/api/generated/shop-wallet/shop-wallet";
import type { ShopDayRange } from "@/features/reporting/types/shop-reporting";

/*
 * Báo cáo của GIAN HÀNG mình (cổng nhà cung cấp, /shop/reports/**). Backend tự
 * khoá theo shop của JWT và cache 1–5 phút, nên staleTime 60s là đủ; dashboard
 * mở là làm mới mỗi 2 phút (Rule 1: không polling dày hơn).
 */

const pad = (n: number) => String(n).padStart(2, "0");

/* Lùi/tiến `delta` ngày của chuỗi yyyy-mm-dd — tính trên UTC để không lệch theo múi giờ máy. */
export function shiftDay(day: string, delta: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

/*
 * "Cùng kỳ tháng trước": từ mùng 1 tháng trước tới đúng ngày hôm nay của tháng
 * đó (kẹp theo số ngày tháng trước, vd 31/3 → 28/2). So cả tháng trước với nửa
 * tháng này sẽ luôn ra "giảm" nên phải so cùng số ngày.
 */
export function previousMonthToDate(today: string): ShopDayRange {
  const [y, m, d] = today.split("-").map(Number);
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  const daysInPrev = new Date(Date.UTC(py, pm, 0)).getUTCDate();
  return { from: `${py}-${pad(pm)}-01`, to: `${py}-${pad(pm)}-${pad(Math.min(d, daysInPrev))}` };
}

export function useShopDashboard() {
  return useShopReportingControllerDashboard({
    query: { staleTime: 60_000, refetchInterval: 120_000 },
  });
}

/* Doanh thu theo kỳ. Backend: tối đa 400 ngày (day) / 60 tháng (month) — màn tự chặn trước khi gọi (`enabled`). */
export function useShopRevenue(params: { from: string; to: string; granularity: "day" | "month" }, enabled = true) {
  return useShopReportingControllerRevenue(params, {
    query: { enabled, placeholderData: keepPreviousData, staleTime: 60_000 },
  });
}

/* Doanh thu tổng của cùng kỳ tháng trước — mẫu số của "so với kỳ trước" trên dashboard. */
export function useShopPrevMonthRevenue(today: string | undefined) {
  const range = today ? previousMonthToDate(today) : undefined;
  return useShopReportingControllerRevenue(
    { from: range?.from, to: range?.to, granularity: "month" },
    { query: { enabled: !!range, staleTime: 5 * 60_000, select: (r) => r.total.revenue } },
  );
}

/* Top sản phẩm bán chạy của shop trong kỳ (backend giới hạn 400 ngày kể cả khi xem theo tháng). */
export function useShopTopProducts(params: { from: string; to: string; limit: number }, enabled = true) {
  return useShopReportingControllerTop(params, {
    query: { enabled, placeholderData: keepPreviousData, staleTime: 60_000 },
  });
}

/* Biến thể sắp hết (khả dụng ≤ ngưỡng, mặc định backend 5). */
export function useShopLowStock(params: { threshold?: number; limit: number }) {
  return useShopReportingControllerLowStock(params, {
    query: { placeholderData: keepPreviousData, staleTime: 60_000 },
  });
}

/*
 * Ví quỹ COD chỉ để cảnh báo trên dashboard — bọc endpoint /shop/wallet tại đây
 * (không import hook của feature shop). Cùng khoá cache Orval với màn ví nên
 * không thêm request khi đã có. `enabled` để nhân viên thiếu shop.wallet.read
 * khỏi bắn một request chắc chắn 403.
 */
export function useShopCodStatus(enabled: boolean) {
  return useShopWalletControllerSummary({
    query: {
      enabled,
      staleTime: 30_000,
      select: (w) => ({ balance: w.balance, codEnabled: w.codEnabled }),
    },
  });
}
