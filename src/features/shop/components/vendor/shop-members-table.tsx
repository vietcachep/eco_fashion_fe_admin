"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { LogOutIcon, RepeatIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { isForbiddenError } from "@/lib/api-error";
import { PERMISSIONS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { SHOP_MEMBER_ROLE_LABEL } from "@/lib/labels";
import type { ShopMemberResponse } from "@/lib/api/generated/model";
import { useLeaveShop, useMyShopMembers, useRemoveShopMember } from "@/features/shop/hooks/use-shop-members";
import { ChangeMemberRoleDialog } from "@/features/shop/components/vendor/change-member-role-dialog";

const PAGE_SIZE = 10;
const LOAD_ERROR = "Không tải được danh sách nhân viên.";

/*
 * Nhân viên gian hàng của CHÍNH vendor (GET /shop/members): đổi vai / gỡ / rời tại chỗ. Thêm người mới ở nút "Thêm nhân viên" của màn cha
 * (chủ shop tạo tài khoản cho nhân viên). Hàng của chủ shop vẫn có nút —
 * "chủ cuối cùng không gỡ/hạ được" do backend quyết (409 SHOP_LAST_OWNER), lỗi hiện nguyên văn qua toast.
 */
export function ShopMembersTable() {
  const [pageIndex, setPageIndex] = useState(0);
  const { data, isLoading, isError, error } = useMyShopMembers({ page: pageIndex + 1, size: PAGE_SIZE });
  const remove = useRemoveShopMember();
  const leave = useLeaveShop();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ShopMemberResponse | null>(null);
  const [roleTarget, setRoleTarget] = useState<ShopMemberResponse | null>(null);

  const columns: ColumnDef<ShopMemberResponse>[] = useMemo(
    () => [
      {
        accessorKey: "fullName",
        header: "Thành viên",
        cell: ({ row }) => (
          <div className="min-w-0 leading-tight">
            <p className="truncate font-medium">{row.original.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        ),
      },
      {
        id: "role",
        header: "Vai trò",
        cell: ({ row }) => (
          <StatusBadge tone={row.original.roleCode === "shop_owner" ? "pending" : "neutral"}>
            {SHOP_MEMBER_ROLE_LABEL[row.original.roleCode] ?? row.original.roleName}
          </StatusBadge>
        ),
      },
      {
        id: "status",
        header: "Trạng thái",
        cell: ({ row }) =>
          row.original.status === "active" ? <StatusBadge tone="success">Đang hoạt động</StatusBadge> : <StatusBadge tone="neutral">Đã gỡ</StatusBadge>,
      },
      {
        id: "createdAt",
        header: "Tham gia",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) =>
          row.original.status === "active" ? (
            <div className="flex justify-end gap-2">
              <PermissionGate permission={PERMISSIONS.shopStaffUpdate}>
                <Button variant="outline" size="sm" className="h-8" onClick={() => setRoleTarget(row.original)}>
                  <RepeatIcon className="size-3.5" />
                  Đổi vai
                </Button>
              </PermissionGate>
              {row.original.isSelf ? (
                // Chính mình: đường "rời" riêng (không cần quyền shop.staff.remove, dùng được cả khi shop chưa duyệt/đã khoá)
                <Button variant="outline" size="sm" className="h-8 text-destructive" onClick={() => setLeaveOpen(true)}>
                  <LogOutIcon className="size-3.5" />
                  Rời gian hàng
                </Button>
              ) : (
                <PermissionGate permission={PERMISSIONS.shopStaffRemove}>
                  <Button variant="outline" size="sm" className="h-8 text-destructive" onClick={() => setRemoveTarget(row.original)}>
                    <Trash2Icon className="size-3.5" />
                    Gỡ
                  </Button>
                </PermissionGate>
              )}
            </div>
          ) : null,
      },
    ],
    [],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-3">
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
      <ChangeMemberRoleDialog member={roleTarget} onClose={() => setRoleTarget(null)} />
      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="Rời khỏi gian hàng này?"
        description="Bạn mất quyền truy cập gian hàng ngay lập tức; cần chủ gian hàng thêm lại nếu muốn quay lại. Chủ gian hàng cuối cùng không thể rời — hãy chỉ định chủ khác trước."
        confirmLabel="Rời gian hàng"
        destructive
        onConfirm={() => leave.mutate()}
      />
      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(v) => !v && setRemoveTarget(null)}
        title={`Gỡ ${removeTarget?.fullName ?? "thành viên"} khỏi gian hàng?`}
        description="Người này mất quyền truy cập gian hàng ngay lập tức; muốn quay lại, thêm lại bằng đúng email cũ (tài khoản cũ được khôi phục). Chủ gian hàng cuối cùng không thể bị gỡ."
        confirmLabel="Gỡ khỏi gian hàng"
        destructive
        onConfirm={() => removeTarget && remove.mutate(removeTarget.id)}
      />
    </div>
  );
}
