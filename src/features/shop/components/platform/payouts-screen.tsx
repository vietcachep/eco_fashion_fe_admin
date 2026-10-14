"use client";

import { useCallback, useMemo, useState } from "react";
import { PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { NativeSelect } from "@/components/shared/native-select";
import { PermissionGate } from "@/components/shared/permission-gate";
import { isForbiddenError } from "@/lib/api-error";
import { PERMISSIONS } from "@/lib/constants";
import { useListState } from "@/hooks/use-list-state";
import { PayoutDetailSheet } from "@/features/shop/components/platform/payout-detail-sheet";
import { PayoutsTable } from "@/features/shop/components/platform/payouts-table";
import { PayosBalanceCard } from "@/features/shop/components/platform/payos-balance-card";
import { RunPayoutDialog } from "@/features/shop/components/platform/run-payout-dialog";
import { useAdminPayouts } from "@/features/shop/hooks/use-admin-payouts";
import { useAdminShopOptions } from "@/features/shop/hooks/use-admin-shops";

export const PAYOUT_TABS = [
  { key: "", label: "Tất cả" },
  { key: "pending", label: "Chờ chi" },
  { key: "processing", label: "Đang chi" },
  { key: "paid", label: "Đã chi" },
  { key: "failed", label: "Chi lỗi" },
  { key: "carried", label: "Mang nợ sang kỳ sau" },
  { key: "settled", label: "Không phát sinh" },
] as const;

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được danh sách kỳ đối soát.";
const DEFAULTS = { status: "", shopId: "" };

/*
 * Đối soát (payout) toàn sàn, quyền supplier.payout.read: thẻ tài khoản chi PayOS, chạy kỳ
 * mới, lọc theo trạng thái + shop, mở chi tiết từng kỳ để chi tiền. Kỳ do job/nhân viên
 * sàn tạo; shop chỉ xem kỳ của mình ở cổng vendor.
 */
export function PayoutsScreen() {
  const { filters, setFilter, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const { data, isLoading, isError, error } = useAdminPayouts({
    status: filters.status || undefined,
    shopId: filters.shopId || undefined,
    page,
    size: PAGE_SIZE,
  });
  const shops = useAdminShopOptions();
  const [openId, setOpenId] = useState<string | null>(null);
  const [runOpen, setRunOpen] = useState(false);

  // Kỳ đối soát chỉ có `shopId`; dịch sang tên nhờ danh sách shop, thiếu (shop ngoài 100 đầu / thiếu quyền) thì hiện mã rút gọn.
  const names = useMemo(() => new Map((shops.data ?? []).map((s) => [s.id, s.name])), [shops.data]);
  const shopLabel = useCallback((shopId: string) => names.get(shopId) ?? `Shop …${shopId.slice(0, 8)}`, [names]);

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-4">
      <PayosBalanceCard />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterTabs tabs={PAYOUT_TABS} value={filters.status} onChange={(v) => setFilter("status", v)} />
        <div className="flex flex-wrap items-center gap-2">
          {shops.data && shops.data.length > 0 ? (
            <NativeSelect aria-label="Gian hàng" className="w-52" value={filters.shopId} onChange={(e) => setFilter("shopId", e.target.value)}>
              <option value="">Mọi gian hàng</option>
              {shops.data.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          ) : null}
          <PermissionGate permission={PERMISSIONS.supplierPayoutProcess}>
            <Button onClick={() => setRunOpen(true)}>
              <PlayIcon className="size-4" />
              Chạy kỳ đối soát
            </Button>
          </PermissionGate>
        </div>
      </div>

      {isError ? <ApiErrorState error={error} fallback={LOAD_ERROR} compact /> : null}
      <PayoutsTable
        data={data?.content ?? []}
        loading={isLoading}
        shopLabel={shopLabel}
        onOpen={(p) => setOpenId(p.id)}
        serverPagination={{
          pageIndex,
          pageSize: PAGE_SIZE,
          pageCount: data?.totalPages || 1,
          total: data?.totalElements ?? 0,
          onPageChange: setPageIndex,
        }}
      />

      {openId ? <PayoutDetailSheet payoutId={openId} shopLabel={shopLabel} onClose={() => setOpenId(null)} /> : null}
      {runOpen ? <RunPayoutDialog onClose={() => setRunOpen(false)} /> : null}
    </div>
  );
}
