"use client";

import { useState } from "react";
import { InfoIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { isForbiddenError } from "@/lib/api-error";
import { ROUTES } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { ViolationSummaryCard } from "@/features/shop/components/violations/violation-summary-card";
import { ViolationsTable } from "@/features/shop/components/violations/violations-table";
import { useMyShopViolations, useMyShopViolationSummary } from "@/features/shop/hooks/use-shop-violations";

const PAGE_SIZE = 10;
const LOAD_ERROR = "Không tải được điểm vi phạm.";
const orderHref = (code: string) => `${ROUTES.vendor.orders}/${code}`;

/*
 * Màn "Điểm vi phạm" của gian hàng CHÍNH MÌNH (quyền shop.order.read — chủ shop và nhân viên xem được): tổng điểm so với ngưỡng
 * trong 30 ngày gần nhất + lịch sử từng điểm kèm đơn liên quan. Chỉ xem; điểm do hệ thống ghi khi đơn quá hạn / bị shop tự huỷ.
 */
export function VendorViolationsScreen() {
  const [pageIndex, setPageIndex] = useState(0);
  const summary = useMyShopViolationSummary();
  const list = useMyShopViolations({ page: pageIndex + 1, size: PAGE_SIZE });

  // Thiếu quyền (backend là lớp chặn thật) → cả màn đổi sang 403; lỗi khác chỉ hiện khung gọn ngay chỗ lỗi.
  const forbidden = [summary.error, list.error].find((e) => isForbiddenError(e));
  if (forbidden) return <ApiErrorState error={forbidden} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-4">
      <ViolationSummaryCard summary={summary.data} loading={summary.isLoading} audience="vendor" />
      {summary.isError ? <ApiErrorState error={summary.error} fallback={LOAD_ERROR} compact /> : null}
      <ViolationRulesNote />
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
      <p className="text-xs text-muted-foreground">{formatNumber(list.data?.totalElements)} lần ghi điểm vi phạm (mọi thời điểm, mới nhất trước).</p>
    </div>
  );
}

/* Điểm vi phạm đến từ đâu — chủ shop hay hỏi "sao tôi bị trừ điểm"; nói ngắn gọn cách tránh để giảm khiếu nại. */
function ViolationRulesNote() {
  return (
    <Card size="sm">
      <CardContent className="flex items-start gap-3">
        <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-muted-foreground">
          <li>
            Điểm được ghi khi đơn <b className="text-foreground">quá hạn xác nhận hoặc quá hạn giao</b> (đơn bị sàn tự huỷ và hoàn tiền cho khách), hoặc khi shop{" "}
            <b className="text-foreground">tự huỷ đơn</b> vì hết hàng, sai giá, đã đóng gói, hay từ chối yêu cầu huỷ của khách rồi tự huỷ.
          </li>
          <li>Mỗi đơn chỉ bị ghi một lần cho mỗi loại vi phạm. Xác nhận đơn và giao hàng đúng hạn, cập nhật tồn kho chính xác để tránh bị trừ điểm.</li>
        </ul>
      </CardContent>
    </Card>
  );
}
