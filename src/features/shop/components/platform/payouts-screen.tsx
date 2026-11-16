"use client";

import { useState } from "react";
import { FlaskConicalIcon, PlayIcon, ZapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { PermissionGate } from "@/components/shared/permission-gate";
import { isForbiddenError } from "@/lib/api-error";
import { PERMISSIONS } from "@/lib/constants";
import { useListState } from "@/hooks/use-list-state";
import { PayoutDetailSheet } from "@/features/shop/components/platform/payout-detail-sheet";
import { PayoutAutoPanel } from "@/features/shop/components/platform/payout-auto-panel";
import { PayoutTestCard } from "@/features/shop/components/platform/payout-test-card";
import { PayoutsTable } from "@/features/shop/components/platform/payouts-table";
import { PayosBalanceCard } from "@/features/shop/components/platform/payos-balance-card";
import { RunPayoutDialog } from "@/features/shop/components/platform/run-payout-dialog";
import { ShopFilter } from "@/features/shop/components/platform/shop-filter";
import { useAdminPayouts } from "@/features/shop/hooks/use-admin-payouts";

/*
 * Tab lọc theo trạng thái kỳ. Ba tab đầu là hàng đợi cần NGƯỜI xử lý (chờ duyệt · không rõ kết quả · đang giữ) nên đứng trước các
 * tab theo vòng đời chi tiền; `deferred` (dưới mức tối thiểu, chưa gộp) và `merged` (đã cộng sang kỳ sau) tách riêng vì khác nghĩa.
 * `key` trùng mã trạng thái backend để dashboard / đường dẫn `?status=held` trỏ thẳng vào đúng tab.
 */
export const PAYOUT_TABS = [
  { key: "", label: "Tất cả" },
  { key: "awaiting_approval", label: "Chờ duyệt" },
  { key: "unknown", label: "Không rõ kết quả" },
  { key: "held", label: "Đang giữ" },
  { key: "pending", label: "Chờ chi" },
  { key: "processing", label: "Đang chi" },
  { key: "paid", label: "Đã chi" },
  { key: "failed", label: "Chi lỗi" },
  { key: "deferred", label: "Chờ dồn kỳ sau" },
  { key: "merged", label: "Đã dồn kỳ sau" },
  { key: "carried", label: "Mang nợ sang kỳ sau" },
  { key: "settled", label: "Không phát sinh" },
] as const;

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được danh sách kỳ đối soát.";
const DEFAULTS = { status: "", shopId: "" };

/*
 * Đối soát (payout) toàn sàn, quyền supplier.payout.read: thẻ tài khoản chi PayOS, chạy kỳ mới, lọc theo trạng thái + shop, mở chi tiết
 * từng kỳ để duyệt / đối chiếu PayOS / mở giữ / chi tiền, và xem các lệnh giữ tay đang hiệu lực. Kỳ do job/nhân viên sàn tạo; shop chỉ xem
 * kỳ của mình ở cổng vendor. Tên shop lấy từ `shopName`/`shopCode` do backend trả kèm mỗi kỳ — kế toán không có quyền đọc shop.
 */
export function PayoutsScreen() {
  const { filters, setFilter, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const { data, isLoading, isError, error } = useAdminPayouts({
    status: filters.status || undefined,
    shopId: filters.shopId || undefined,
    page,
    size: PAGE_SIZE,
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const [runOpen, setRunOpen] = useState(false);
  // Panel công tắc chi trả tự động theo shop (PLAN-0046).
  const [autoOpen, setAutoOpen] = useState(false);
  // Công cụ thử chi (chuyển tiền thật bằng tài khoản nhập tay) — chỉ người có quyền duyệt chi trả.
  const [testOpen, setTestOpen] = useState(false);

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-4">
      <PayosBalanceCard />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterTabs tabs={PAYOUT_TABS} value={filters.status} onChange={(v) => setFilter("status", v)} />
        <div className="flex flex-wrap items-center gap-2">
          <ShopFilter value={filters.shopId} onChange={(v) => setFilter("shopId", v)} />
          <Button variant="outline" aria-pressed={autoOpen} onClick={() => setAutoOpen((v) => !v)}>
            <ZapIcon className="size-4" />
            Chi tự động theo shop
          </Button>
          <PermissionGate permission={PERMISSIONS.supplierPayoutApprove}>
            <Button variant="outline" aria-pressed={testOpen} onClick={() => setTestOpen((v) => !v)}>
              <FlaskConicalIcon className="size-4" />
              Thử chi tự động
            </Button>
          </PermissionGate>
          <PermissionGate permission={PERMISSIONS.supplierPayoutProcess}>
            <Button onClick={() => setRunOpen(true)}>
              <PlayIcon className="size-4" />
              Chạy kỳ đối soát
            </Button>
          </PermissionGate>
        </div>
      </div>

      {testOpen ? <PayoutTestCard /> : null}
      {autoOpen ? <PayoutAutoPanel /> : null}

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

      {openId ? <PayoutDetailSheet payoutId={openId} onClose={() => setOpenId(null)} /> : null}
      {/* Đang lọc một shop ⇒ chạy kỳ chỉ cho shop đó; không lọc ⇒ mọi shop. */}
      {runOpen ? <RunPayoutDialog shopId={filters.shopId || undefined} onClose={() => setRunOpen(false)} /> : null}
    </div>
  );
}
