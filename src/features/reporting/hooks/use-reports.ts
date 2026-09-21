"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminReportingControllerRecompute,
  useAdminReportingControllerDashboard,
  useAdminReportingControllerInventory,
  useAdminReportingControllerLowStock,
  useAdminReportingControllerRevenue,
  useAdminReportingControllerTop,
} from "@/lib/api/generated/admin-reports/admin-reports";
import type { RecomputeRequest } from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import type {
  DashboardResponse,
  InventorySummary,
  LowStockRow,
  RevenueResponse,
  TopProductRow,
} from "@/features/reporting/types/reporting";

/*
 * Hook báo cáo — bọc hook Orval của tag admin-reports. Swagger không khai
 * schema response nên Orval sinh `void`; `select` ép về DTO viết tay trong
 * types/ (khớp backend). Đây là điểm ép kiểu DUY NHẤT của module.
 *
 * Dashboard: backend cache Redis 60–300s, worker tính lại 5 phút/lần → refetch
 * mỗi 2 phút khi màn đang mở là đủ, không polling dày.
 */
export function useDashboard() {
  return useAdminReportingControllerDashboard({
    query: {
      select: (d) => d as unknown as DashboardResponse,
      staleTime: 60_000,
      refetchInterval: 120_000,
    },
  });
}

export function useRevenueReport(params: { from: string; to: string; granularity: "day" | "month" }) {
  return useAdminReportingControllerRevenue(params, {
    query: {
      select: (d) => d as unknown as RevenueResponse,
      placeholderData: keepPreviousData,
      staleTime: 60_000,
    },
  });
}

export function useTopProducts(params: { from: string; to: string; limit: number }) {
  return useAdminReportingControllerTop(params, {
    query: {
      select: (d) => d as unknown as TopProductRow[],
      placeholderData: keepPreviousData,
      staleTime: 60_000,
    },
  });
}

export function useLowStock(params: { threshold: number; limit: number }) {
  return useAdminReportingControllerLowStock(params, {
    query: {
      select: (d) => d as unknown as LowStockRow[],
      placeholderData: keepPreviousData,
      staleTime: 60_000,
    },
  });
}

export function useInventorySummary() {
  return useAdminReportingControllerInventory({
    query: { select: (d) => d as unknown as InventorySummary, staleTime: 60_000 },
  });
}

/* Tính lại daily_sales cho khoảng ngày (tối đa 400 ngày) rồi làm mới mọi báo cáo. */
export function useRecomputeReports() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RecomputeRequest) => adminReportingControllerRecompute(body),
    onSuccess: (res) => {
      const days = (res as unknown as { days?: number } | undefined)?.days;
      toast.success(days ? `Đã tính lại ${days} ngày.` : "Đã tính lại số liệu.");
      qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).includes("/admin/reports") });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Tính lại số liệu thất bại.")),
  });
}
