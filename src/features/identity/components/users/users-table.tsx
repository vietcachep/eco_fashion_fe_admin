"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { EyeIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { InitialsAvatar } from "@/components/shared/initials-avatar";
import { NativeSelect } from "@/components/shared/native-select";
import { StatusBadge } from "@/components/shared/status-badge";
import { isForbiddenError } from "@/lib/api-error";
import { ROUTES, STAFF_ROLES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { statusMeta, USER_STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { useListState } from "@/hooks/use-list-state";
import { useAdminUsers } from "@/features/identity/hooks/use-admin-users";
import type { UserProfileResponse } from "@/lib/api/generated/model";

/*
 * Lọc theo NHÓM (nhân viên / khách / tất cả) + trạng thái backend. Với nhóm
 * "nhân viên" gửi staffOnly=true; "khách" gửi roleCode=customer.
 */
const GROUP_TABS = [
  { key: "", label: "Tất cả" },
  { key: "staff", label: "Nhân viên" },
  { key: "customer", label: "Khách hàng" },
] as const;

const STATUS_TABS = [
  { key: "", label: "Mọi trạng thái" },
  { key: "active", label: "Hoạt động" },
  { key: "locked", label: "Đã khoá" },
  { key: "pending_verification", label: "Chờ xác minh" },
] as const;

const PAGE_SIZE = 10;
const LOAD_ERROR = "Không tải được danh sách người dùng.";
const DEFAULTS = { group: "", status: "", roleCode: "" };

export function UsersTable() {
  const { filters, setFilter, search, setSearch, keyword, pageIndex, setPageIndex, page } =
    useListState(DEFAULTS);

  const { data, isLoading, isError, error } = useAdminUsers({
    keyword,
    status: filters.status,
    staffOnly: filters.group === "staff" || undefined,
    roleCode: filters.group === "customer" ? "customer" : filters.roleCode || undefined,
    page,
    size: PAGE_SIZE,
  });
  const rows = data?.content ?? [];

  const columns: ColumnDef<UserProfileResponse>[] = useMemo(
    () => [
      {
        accessorKey: "fullName",
        header: "Người dùng",
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className={cn("flex items-center gap-3", u.status === "locked" && "opacity-60")}>
              <InitialsAvatar name={u.fullName || u.email} src={u.avatarUrl ?? undefined} />
              <div className="leading-tight">
                <Link href={`${ROUTES.identity.users}/${u.id}`} className="font-medium hover:underline">
                  {u.fullName || u.email}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {u.email}
                  {u.phone ? ` · ${u.phone}` : ""}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "roleName",
        header: "Vai trò",
        cell: ({ row }) => (
          <Badge variant={row.original.roleCode === "customer" ? "outline" : "secondary"} className="font-normal">
            {row.original.roleName}
          </Badge>
        ),
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const m = statusMeta(USER_STATUS, row.original.status);
          return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
        },
      },
      {
        id: "lastLoginAt",
        header: "Đăng nhập cuối",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{formatDateTime(row.original.lastLoginAt)}</span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              className="h-8 rounded-lg"
              render={<Link href={`${ROUTES.identity.users}/${row.original.id}`} />}
            >
              <EyeIcon className="size-3.5" />
              Chi tiết
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  // 403 → màn 403 đầy đủ thay vì tab lọc + bảng rỗng (xem ApiErrorState).
  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <FilterTabs tabs={GROUP_TABS} value={filters.group} onChange={(v) => setFilter("group", v)} />
        <FilterTabs tabs={STATUS_TABS} value={filters.status} onChange={(v) => setFilter("status", v)} />
        {filters.group === "staff" ? (
          <NativeSelect
            aria-label="Lọc theo vai"
            className="w-44"
            value={filters.roleCode}
            onChange={(e) => setFilter("roleCode", e.target.value)}
          >
            <option value="">Mọi vai</option>
            {STAFF_ROLES.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </NativeSelect>
        ) : null}
      </div>

      {isError ? <ApiErrorState error={error} fallback={LOAD_ERROR} compact /> : null}

      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        searchPlaceholder="Tìm theo email, họ tên, SĐT…"
        searchValue={search}
        onSearchChange={setSearch}
        serverPagination={{
          pageIndex,
          pageSize: PAGE_SIZE,
          pageCount: data?.totalPages || 1,
          total: data?.totalElements ?? 0,
          onPageChange: setPageIndex,
        }}
      />
    </div>
  );
}
