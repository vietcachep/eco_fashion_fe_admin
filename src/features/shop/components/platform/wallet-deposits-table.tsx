"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { DataTable } from "@/components/shared/data-table";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { isForbiddenError } from "@/lib/api-error";
import { PERMISSIONS } from "@/lib/constants";
import { formatDateTime, formatVnd } from "@/lib/format";
import { DEPOSIT_STATUS, statusMeta } from "@/lib/labels";
import type { DepositRequestResponse } from "@/lib/api/generated/model";
import { useListState } from "@/hooks/use-list-state";
import { DepositProofPreview } from "@/features/shop/components/platform/deposit-proof-preview";
import { ReasonDialog } from "@/features/shop/components/platform/reason-dialog";
import { ShopIdentity } from "@/features/shop/components/platform/shop-cells";
import { useAdminDeposits, useApproveDeposit, useRejectDeposit } from "@/features/shop/hooks/use-admin-deposits";
import { DEPOSIT_APPROVE_RULE, DEPOSIT_REJECT_RULE } from "@/features/shop/schemas/reason-schema";

const TABS = [
  { key: "pending", label: "Chờ duyệt" },
  { key: "approved", label: "Đã duyệt" },
  { key: "rejected", label: "Từ chối" },
] as const;

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được yêu cầu nộp quỹ.";
const DEFAULTS = { status: "pending" };

interface Review {
  kind: "approve" | "reject";
  deposit: DepositRequestResponse;
}

/*
 * Yêu cầu nộp quỹ COD của shop (quyền đọc supplier.wallet.read, duyệt/từ chối supplier.wallet.adjust).
 * Kế toán đối chiếu ảnh chứng từ với sao kê rồi duyệt (cộng ví, COD mở lại nếu ví > 0) hoặc từ chối
 * (bắt buộc lý do để shop biết sửa gì). Mặc định mở tab "Chờ duyệt" — việc cần làm ngay.
 */
export function WalletDepositsTable() {
  const { filters, setFilter, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const { data, isLoading, isError, error } = useAdminDeposits({ status: filters.status || undefined, page, size: PAGE_SIZE });
  const approve = useApproveDeposit();
  const reject = useRejectDeposit();
  const [review, setReview] = useState<Review | null>(null);

  const columns: ColumnDef<DepositRequestResponse>[] = useMemo(
    () => [
      {
        id: "shop",
        header: "Gian hàng",
        cell: ({ row }) => <ShopIdentity id={row.original.shopId} name={row.original.shopName} tab="wallet" />,
      },
      { id: "amount", header: "Số tiền", cell: ({ row }) => <span className="font-semibold tabular-nums">{formatVnd(row.original.amount)}</span> },
      { id: "proof", header: "Chứng từ", cell: ({ row }) => <DepositProofPreview url={row.original.proofUrl} shopName={row.original.shopName} /> },
      {
        id: "note",
        header: "Ghi chú",
        cell: ({ row }) => <span className="block max-w-64 text-sm text-muted-foreground">{row.original.note ?? "—"}</span>,
      },
      {
        id: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const meta = statusMeta(DEPOSIT_STATUS, row.original.status);
          return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
        },
      },
      {
        id: "createdAt",
        header: "Ngày gửi",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) =>
          row.original.status === "pending" ? (
            <div className="flex justify-end gap-1.5">
              <PermissionGate permission={PERMISSIONS.supplierWalletAdjust}>
                <Button size="sm" className="h-8" onClick={() => setReview({ kind: "approve", deposit: row.original })}>
                  <CheckIcon className="size-3.5" />
                  Duyệt
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-destructive" onClick={() => setReview({ kind: "reject", deposit: row.original })}>
                  <XIcon className="size-3.5" />
                  Từ chối
                </Button>
              </PermissionGate>
            </div>
          ) : null,
      },
    ],
    [],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  const close = () => setReview(null);

  return (
    <div className="flex flex-col gap-3">
      <FilterTabs tabs={TABS} value={filters.status} onChange={(v) => setFilter("status", v)} />
      {isError ? <ApiErrorState error={error} fallback={LOAD_ERROR} compact /> : null}
      <DataTable
        columns={columns}
        data={data?.content ?? []}
        loading={isLoading}
        serverPagination={{
          pageIndex,
          pageSize: PAGE_SIZE,
          pageCount: data?.totalPages || 1,
          total: data?.totalElements ?? 0,
          onPageChange: setPageIndex,
        }}
      />

      {review?.kind === "approve" ? (
        <ReasonDialog
          title="Duyệt yêu cầu nộp quỹ?"
          description={`Cộng ${formatVnd(review.deposit.amount)} vào ví quỹ của ${review.deposit.shopName ?? "gian hàng"}. COD được mở lại nếu ví > 0.`}
          label="Ghi chú (tuỳ chọn)"
          placeholder="Đã đối chiếu sao kê…"
          confirmLabel="Duyệt & cộng ví"
          rule={DEPOSIT_APPROVE_RULE}
          pending={approve.isPending}
          onSubmit={(note) => approve.mutate({ id: review.deposit.id, note }, { onSuccess: close })}
          onClose={close}
        />
      ) : null}
      {review?.kind === "reject" ? (
        <ReasonDialog
          title="Từ chối yêu cầu nộp quỹ?"
          description={`Yêu cầu ${formatVnd(review.deposit.amount)} của ${review.deposit.shopName ?? "gian hàng"} sẽ bị từ chối kèm lý do bạn nhập; không cộng ví.`}
          label="Lý do từ chối"
          placeholder="Chứng từ không khớp số tiền…"
          confirmLabel="Từ chối"
          destructive
          rule={DEPOSIT_REJECT_RULE}
          pending={reject.isPending}
          onSubmit={(note) => reject.mutate({ id: review.deposit.id, note }, { onSuccess: close })}
          onClose={close}
        />
      ) : null}
    </div>
  );
}
