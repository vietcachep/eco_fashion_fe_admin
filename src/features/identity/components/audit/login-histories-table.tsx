"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { isForbiddenError } from "@/lib/api-error";
import { formatDateTime, truncate } from "@/lib/format";
import { useListState } from "@/hooks/use-list-state";
import { useLoginHistories } from "@/features/identity/hooks/use-audit";
import type { LoginHistoryResponse } from "@/features/identity/types/identity";

const TABS = [
  { key: "", label: "Tất cả" },
  { key: "ok", label: "Thành công" },
  { key: "fail", label: "Thất bại" },
] as const;

const REASON_LABEL: Record<string, string> = {
  INVALID_CREDENTIALS: "Sai mật khẩu",
  ACCOUNT_LOCKED: "Tài khoản bị khoá",
  USER_NOT_FOUND: "Không có tài khoản",
  GOOGLE: "Google",
};

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được lịch sử đăng nhập.";
const DEFAULTS = { result: "" };

/* Lịch sử đăng nhập toàn hệ thống — lọc kết quả, tìm theo email. */
export function LoginHistoriesTable() {
  const { filters, setFilter, search, setSearch, keyword, pageIndex, setPageIndex, page } = useListState(DEFAULTS);

  const { data, isLoading, isError, error } = useLoginHistories({
    page,
    size: PAGE_SIZE,
    email: keyword,
    success: filters.result === "ok" ? true : filters.result === "fail" ? false : undefined,
  });

  const columns: ColumnDef<LoginHistoryResponse>[] = useMemo(
    () => [
      {
        accessorKey: "createdAt",
        header: "Thời gian",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>,
      },
      { accessorKey: "email", header: "Email" },
      {
        accessorKey: "success",
        header: "Kết quả",
        cell: ({ row }) =>
          row.original.success ? (
            <StatusBadge tone="success">Thành công</StatusBadge>
          ) : (
            <StatusBadge tone="danger">{REASON_LABEL[row.original.reason ?? ""] ?? row.original.reason ?? "Thất bại"}</StatusBadge>
          ),
      },
      { accessorKey: "ipAddress", header: "IP", cell: ({ row }) => <span className="font-mono text-xs">{row.original.ipAddress ?? "—"}</span> },
      {
        accessorKey: "userAgent",
        header: "Thiết bị",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground" title={row.original.userAgent ?? ""}>
            {truncate(row.original.userAgent, 60) || "—"}
          </span>
        ),
      },
    ],
    [],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-3">
      <FilterTabs tabs={TABS} value={filters.result} onChange={(v) => setFilter("result", v)} />
      {isError ? <ApiErrorState error={error} fallback={LOAD_ERROR} compact /> : null}
      <DataTable
        columns={columns}
        data={data?.content ?? []}
        loading={isLoading}
        searchPlaceholder="Tìm theo email…"
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
