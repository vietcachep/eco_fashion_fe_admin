"use client";

import { useState } from "react";
import { PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PERMISSIONS } from "@/lib/constants";
import { PAYOUT_TABS } from "@/features/shop/components/platform/payouts-screen";
import { PayoutDetailSheet } from "@/features/shop/components/platform/payout-detail-sheet";
import { PayoutsTable } from "@/features/shop/components/platform/payouts-table";
import { RunPayoutDialog } from "@/features/shop/components/platform/run-payout-dialog";
import { useAdminPayouts } from "@/features/shop/hooks/use-admin-payouts";

const PAGE_SIZE = 10;
const LOAD_ERROR = "Không tải được các kỳ đối soát của gian hàng.";

/*
 * Tab "Đối soát" ở chi tiết shop: các kỳ đối soát của shop này (GET /admin/payouts?shopId=). Trạng thái lọc + trang giữ bằng state cục bộ — KHÔNG dùng `useListState` vì nó ghi đè
 * query string của trang (làm mất `?tab=payouts`).
 */
export function ShopPayoutsTab({ shopId, shopName }: { shopId: string; shopName: string }) {
  const [status, setStatus] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [runOpen, setRunOpen] = useState(false);
  const { data, isLoading, isError, error } = useAdminPayouts({ status: status || undefined, shopId, page: pageIndex + 1, size: PAGE_SIZE });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FilterTabs
            tabs={PAYOUT_TABS}
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPageIndex(0);
            }}
          />
          <PermissionGate permission={PERMISSIONS.supplierPayoutProcess}>
            <Button variant="outline" size="sm" onClick={() => setRunOpen(true)}>
              <PlayIcon className="size-3.5" />
              Chạy kỳ cho shop này
            </Button>
          </PermissionGate>
        </div>
        {isError ? <ApiErrorState error={error} fallback={LOAD_ERROR} compact /> : null}
        <PayoutsTable
          data={data?.content ?? []}
          loading={isLoading}
          showShop={false}
          onOpen={(p) => setOpenId(p.id)}
          serverPagination={{
            pageIndex,
            pageSize: PAGE_SIZE,
            pageCount: data?.totalPages || 1,
            total: data?.totalElements ?? 0,
            onPageChange: setPageIndex,
          }}
        />
      </div>

      {openId ? <PayoutDetailSheet payoutId={openId} onClose={() => setOpenId(null)} /> : null}
      {runOpen ? <RunPayoutDialog shopId={shopId} shopName={shopName} onClose={() => setRunOpen(false)} /> : null}
    </div>
  );
}
