"use client";

import { useState } from "react";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { ROUTES } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { ViolationSummaryCard } from "@/features/shop/components/violations/violation-summary-card";
import { ViolationsTable } from "@/features/shop/components/violations/violations-table";
import { useAdminShopViolations, useAdminShopViolationSummary } from "@/features/shop/hooks/use-shop-violations";

const PAGE_SIZE = 10;
const LOAD_ERROR = "Không tải được điểm vi phạm của gian hàng.";
const orderHref = (code: string) => `${ROUTES.order.orders}/${code}`;

/*
 * Tab "Vi phạm" ở chi tiết gian hàng phía sàn (quyền supplier.shop.read — cùng quyền xem chi tiết shop): điểm vi phạm xử lý đơn 30 ngày
 * của shop so với ngưỡng nhắc khoá, kèm lịch sử từng điểm để quản lý đối chiếu trước khi quyết định khoá (nút Khoá ở đầu trang).
 * Là panel con của trang chi tiết nên lỗi hiện khung gọn (`compact`) — trang cha đã chặn 403 ở lần tải shop.
 */
export function ShopViolationsTab({ shopId }: { shopId: string }) {
  const [pageIndex, setPageIndex] = useState(0);
  const summary = useAdminShopViolationSummary(shopId);
  const list = useAdminShopViolations(shopId, { page: pageIndex + 1, size: PAGE_SIZE });

  return (
    <div className="flex flex-col gap-4">
      <ViolationSummaryCard summary={summary.data} loading={summary.isLoading} audience="platform" />
      {summary.isError ? <ApiErrorState error={summary.error} fallback={LOAD_ERROR} compact /> : null}
      {list.isError ? <ApiErrorState error={list.error} fallback={LOAD_ERROR} compact /> : null}
      <ViolationsTable
        rows={list.data?.content ?? []}
        loading={list.isLoading}
        orderHref={orderHref}
        pageIndex={pageIndex}
        pageSize={PAGE_SIZE}
        pageCount={list.data?.totalPages ?? 1}
        total={list.data?.totalElements ?? 0}
        onPageChange={setPageIndex}
      />
      <p className="text-xs text-muted-foreground">{formatNumber(list.data?.totalElements)} lần ghi điểm vi phạm của shop (mọi thời điểm, mới nhất trước).</p>
    </div>
  );
}
