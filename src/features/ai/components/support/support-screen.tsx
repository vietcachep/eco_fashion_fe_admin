"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { isForbiddenError } from "@/lib/api-error";
import { formatDateTime } from "@/lib/format";
import { statusMeta, SUPPORT_STATUS } from "@/lib/labels";
import { useListState } from "@/hooks/use-list-state";
import { useSupportRequests } from "@/features/ai/hooks/use-ai-admin";
import { SupportDialog } from "@/features/ai/components/support/support-dialog";
import type { SupportRequestResponse } from "@/features/ai/types/ai";

const TABS = [
  { key: "", label: "Tất cả" },
  { key: "open", label: "Mới" },
  { key: "in_progress", label: "Đang xử lý" },
  { key: "resolved", label: "Đã đóng" },
] as const;

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được yêu cầu hỗ trợ.";
const DEFAULTS = { status: "" };

/* Yêu cầu hỗ trợ do chatbot chuyển sang người thật — bảng + popup xử lý (support-dialog). */
export function SupportScreen() {
  const { filters, setFilter, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const { data, isLoading, isError, error } = useSupportRequests({ status: filters.status, page, size: PAGE_SIZE });
  const [selected, setSelected] = useState<SupportRequestResponse | null>(null);

  const columns: ColumnDef<SupportRequestResponse>[] = useMemo(
    () => [
      {
        accessorKey: "summary",
        header: "Yêu cầu",
        cell: ({ row }) => (
          <div className="max-w-md leading-tight">
            <p className="text-sm">{row.original.summary}</p>
            <p className="text-xs text-muted-foreground">{row.original.email ?? (row.original.userId ? "Khách đăng nhập" : "Khách vãng lai")}</p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const m = statusMeta(SUPPORT_STATUS, row.original.status);
          return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
        },
      },
      { accessorKey: "createdAt", header: "Gửi lúc", cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.createdAt)}</span> },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="h-8" onClick={() => setSelected(row.original)}>
              Xử lý
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  if (isForbiddenError(error)) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

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
      <SupportDialog request={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

