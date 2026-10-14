"use client";

import { useState } from "react";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { PAYOUT_TABS } from "@/features/shop/components/platform/payouts-screen";
import { PayoutDetailSheet } from "@/features/shop/components/platform/payout-detail-sheet";
import { PayoutsTable } from "@/features/shop/components/platform/payouts-table";
import { useAdminPayouts } from "@/features/shop/hooks/use-admin-payouts";

const PAGE_SIZE = 10;
const LOAD_ERROR = "Không tải được các kỳ đối soát của gian hàng.";

/*
 * Tab "Đối soát" ở chi tiết shop: các kỳ của RIÊNG shop này (GET /admin/payouts?shopId=).
 * Trạng thái lọc + trang giữ bằng state cục bộ — KHÔNG dùng `useListState` vì nó ghi đè
 * query string của trang (làm mất `?tab=payouts`).
 */
export function ShopPayoutsTab({ shopId, shopName }: { shopId: string; shopName: string }) {
  const [status, setStatus] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading, isError, error } = useAdminPayouts({ status: status || undefined, shopId, page: pageIndex + 1, size: PAGE_SIZE });

  return (
    <div className="flex flex-col gap-3">
      <FilterTabs
        tabs={PAYOUT_TABS}
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPageIndex(0);
        }}
      />
      {isError ? <ApiErrorState error={error} fallback={LOAD_ERROR} compact /> : null}
      <PayoutsTable
        data={data?.content ?? []}
        loading={isLoading}
        onOpen={(p) => setOpenId(p.id)}
        serverPagination={{
          pageIndex,
          pageSize: PAGE_SIZE,
          pageCount: data?.totalPages || 1,
          total: data?.totalElements ?? 0,
          onPageChange: setPageIndex,
        }}
      />
      {openId ? <PayoutDetailSheet payoutId={openId} shopLabel={() => shopName} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}
