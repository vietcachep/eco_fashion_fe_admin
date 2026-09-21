"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/shared/data-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { isForbiddenError } from "@/lib/api-error";
import { formatDateTime } from "@/lib/format";
import { useListState } from "@/hooks/use-list-state";
import { useAuditLogs } from "@/features/identity/hooks/use-audit";
import type { AuditLogResponse } from "@/features/identity/types/identity";

const PAGE_SIZE = 15;
const LOAD_ERROR = "Không tải được nhật ký.";
const DEFAULTS = { action: "", entityType: "" };

/* Nhật ký thao tác identity (ai làm gì, trước/sau). Lọc theo action / loại thực thể. */
export function AuditLogsTable() {
  const { filters, setFilter, pageIndex, setPageIndex, page } = useListState(DEFAULTS);
  const [detail, setDetail] = useState<AuditLogResponse | null>(null);

  const { data, isLoading, isError, error } = useAuditLogs({
    page,
    size: PAGE_SIZE,
    action: filters.action,
    entityType: filters.entityType,
  });

  const columns: ColumnDef<AuditLogResponse>[] = useMemo(
    () => [
      {
        accessorKey: "createdAt",
        header: "Thời gian",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>,
      },
      {
        accessorKey: "action",
        header: "Hành động",
        cell: ({ row }) => (
          <Badge variant="secondary" className="font-mono text-[11px]">
            {row.original.action}
          </Badge>
        ),
      },
      {
        id: "entity",
        header: "Đối tượng",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.entityType}
            {row.original.entityCode ? ` · ${row.original.entityCode}` : ""}
          </span>
        ),
      },
      { accessorKey: "actorEmail", header: "Người thực hiện", cell: ({ row }) => row.original.actorEmail ?? "hệ thống" },
      { accessorKey: "ipAddress", header: "IP", cell: ({ row }) => <span className="font-mono text-xs">{row.original.ipAddress ?? "—"}</span> },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setDetail(row.original)}>
              Xem
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
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Lọc theo action (vd USER_LOCKED)"
          className="h-8 max-w-xs"
          value={filters.action}
          onChange={(e) => setFilter("action", e.target.value.toUpperCase())}
        />
        <Input
          placeholder="Loại đối tượng (user, role…)"
          className="h-8 max-w-xs"
          value={filters.entityType}
          onChange={(e) => setFilter("entityType", e.target.value)}
        />
      </div>
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

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {detail?.action} · {detail?.entityType} {detail?.entityCode ?? detail?.entityId ?? ""}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-xs sm:grid-cols-2">
            <div>
              <p className="pb-1 font-medium">Trước</p>
              <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 font-mono">
                {JSON.stringify(detail?.before ?? null, null, 2)}
              </pre>
            </div>
            <div>
              <p className="pb-1 font-medium">Sau</p>
              <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 font-mono">
                {JSON.stringify(detail?.after ?? null, null, 2)}
              </pre>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            requestId: <code className="font-mono">{detail?.requestId ?? "—"}</code>
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
