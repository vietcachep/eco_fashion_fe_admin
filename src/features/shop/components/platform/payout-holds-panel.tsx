"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { HandIcon, LockOpenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { PERMISSIONS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { PayoutHoldResponse } from "@/lib/api/generated/model";
import { ReasonDialog } from "@/features/shop/components/platform/reason-dialog";
import { useCreatePayoutHold, usePayoutHolds, useReleasePayoutHold } from "@/features/shop/hooks/use-payout-holds";
import { PAYOUT_HOLD_REASON_RULE } from "@/features/shop/schemas/payout-hold-schema";

const LOAD_ERROR = "Không tải được các lệnh giữ chi trả.";

/*
 * Lệnh GIỮ TAY tiền chi trả (kế toán / quản lý chủ động chặn chi cho một shop — vd nghi ngờ gian lận, đang tranh chấp).
 *   - Có `shopId` (tab "Đối soát" ở chi tiết shop): LỊCH SỬ lệnh giữ của shop + nút "Giữ chi trả" khi chưa có lệnh nào đang hiệu lực.
 *   - Bỏ trống `shopId` (màn đối soát toàn sàn): chỉ các lệnh ĐANG hiệu lực của mọi shop, để mở giữ nhanh.
 * Mỗi shop tối đa một lệnh đang hiệu lực (backend trả 409 PAYOUT_HOLD_EXISTS nếu trùng). Giữ tay chỉ là MỘT trong các lý do giữ kỳ chi:
 * mở lệnh không ép kỳ đi tiếp nếu shop vẫn bị khoá / vừa đổi tài khoản ngân hàng — số kỳ thực sự được mở báo ngay sau khi mở.
 * Xem cần `supplier.payout.read`; tạo / mở cần `supplier.payout.process` (nút ẩn khi thiếu quyền).
 */
export function PayoutHoldsPanel({ shopId, shopName }: { shopId?: string; shopName?: string }) {
  const { data, isLoading, isError, error } = usePayoutHolds(shopId);
  const create = useCreatePayoutHold();
  const release = useReleasePayoutHold();
  const [creating, setCreating] = useState(false);
  const [toRelease, setToRelease] = useState<PayoutHoldResponse | null>(null);

  const holds = useMemo(() => data ?? [], [data]);
  const active = holds.filter((h) => h.releasedAt === null);
  const perShop = !!shopId;

  const columns: ColumnDef<PayoutHoldResponse>[] = useMemo(() => {
    const cols: ColumnDef<PayoutHoldResponse>[] = [];
    if (!perShop) {
      cols.push({
        id: "shop",
        header: "Gian hàng",
        cell: ({ row }) => (
          <div className="flex flex-col leading-tight">
            <span className="font-medium">{row.original.shopName ?? row.original.shopCode ?? `Shop …${row.original.shopId.slice(0, 8)}`}</span>
            {row.original.shopName && row.original.shopCode ? <span className="font-mono text-xs text-muted-foreground">{row.original.shopCode}</span> : null}
          </div>
        ),
      });
    }
    cols.push(
      { id: "reason", header: "Lý do giữ", cell: ({ row }) => <span className="block max-w-md text-sm whitespace-normal">{row.original.reason}</span> },
      { id: "at", header: "Giữ lúc", cell: ({ row }) => <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(row.original.createdAt)}</span> },
      {
        id: "state",
        header: "Trạng thái",
        cell: ({ row }) =>
          row.original.releasedAt ? (
            <div className="flex flex-col items-start gap-0.5">
              <StatusBadge tone="neutral">Đã mở giữ</StatusBadge>
              <span className="text-xs text-muted-foreground">{formatDateTime(row.original.releasedAt)}</span>
            </div>
          ) : (
            <StatusBadge tone="warning">Đang giữ</StatusBadge>
          ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) =>
          row.original.releasedAt ? null : (
            <PermissionGate permission={PERMISSIONS.supplierPayoutProcess}>
              <div className="flex justify-end">
                <Button size="sm" variant="outline" className="h-8" disabled={release.isPending} onClick={() => setToRelease(row.original)}>
                  <LockOpenIcon className="size-3.5" />
                  Mở giữ
                </Button>
              </div>
            </PermissionGate>
          ),
      },
    );
    return cols;
  }, [perShop, release.isPending]);

  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <HandIcon className="size-4 text-muted-foreground" />
              {perShop ? "Lệnh giữ chi trả" : "Lệnh giữ chi trả đang hiệu lực"}
              {!isLoading && !isError ? <span className="text-xs font-normal text-muted-foreground">({perShop ? `${active.length} đang giữ / ${holds.length} lệnh` : active.length})</span> : null}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {perShop
                ? "Khi có lệnh giữ, kỳ đối soát mới của shop vào trạng thái \"Đang giữ\" và kỳ đang chờ chi/chờ duyệt bị chuyển sang giữ. Mở lệnh để chi tiếp."
                : "Shop có lệnh giữ không được chi tiền cho tới khi lệnh được mở. Tạo lệnh mới ở tab \"Đối soát\" trong chi tiết từng gian hàng."}
            </p>
          </div>
          {perShop && active.length === 0 ? (
            <PermissionGate permission={PERMISSIONS.supplierPayoutProcess}>
              <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
                <HandIcon className="size-3.5" />
                Giữ chi trả
              </Button>
            </PermissionGate>
          ) : null}
        </div>

        {isError ? (
          <ApiErrorState error={error} fallback={LOAD_ERROR} compact />
        ) : !isLoading && holds.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
            {perShop ? "Chưa có lệnh giữ nào cho gian hàng này." : "Hiện không có lệnh giữ nào đang hiệu lực."}
          </p>
        ) : (
          <DataTable columns={columns} data={holds} loading={isLoading} pageSize={5} />
        )}
      </CardContent>

      {creating && shopId ? (
        <ReasonDialog
          title="Giữ tiền chi trả của gian hàng"
          description={`${shopName ?? "Gian hàng"} sẽ không được chi tiền cho tới khi bạn mở lệnh giữ. Lý do hiển thị cho kế toán và quản lý.`}
          label="Lý do giữ"
          placeholder="Nghi ngờ gian lận đơn, đang chờ xác minh giấy tờ…"
          confirmLabel="Giữ chi trả"
          rule={PAYOUT_HOLD_REASON_RULE}
          pending={create.isPending}
          onSubmit={(reason) => create.mutate({ shopId, reason }, { onSuccess: () => setCreating(false) })}
          onClose={() => setCreating(false)}
        />
      ) : null}
      <ConfirmDialog
        open={!!toRelease}
        onOpenChange={(o) => !o && setToRelease(null)}
        title="Mở lệnh giữ chi trả?"
        description={
          toRelease
            ? `${toRelease.shopName ?? shopName ?? "Gian hàng"} — "${toRelease.reason}". Các kỳ đang giữ của shop không còn lý do giữ nào khác sẽ được đẩy tiếp (chi hoặc chờ duyệt).`
            : undefined
        }
        confirmLabel="Mở giữ"
        onConfirm={() => toRelease && release.mutate(toRelease.id)}
      />
    </Card>
  );
}
