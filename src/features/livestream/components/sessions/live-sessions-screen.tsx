"use client";
import { useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { PlusIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { NativeSelect } from "@/components/shared/native-select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useListState } from "@/hooks/use-list-state";
import { usePermission } from "@/hooks/use-permission";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { isForbiddenError } from "@/lib/api-error";
import { useLiveCommands, useLiveSessions } from "../../hooks/use-livestream";
import { LIVE_LABELS, type LiveSession } from "../../types/live";
import { LiveSessionBadge } from "./live-session-badge";

const DEFAULTS = { state: "" };
export function LiveSessionsScreen({
  platform = false,
}: {
  platform?: boolean;
}) {
  const state = useListState(DEFAULTS);
  const query = useLiveSessions(platform, {
    page: state.page,
    size: 15,
    q: state.keyword || undefined,
    state: state.filters.state || undefined,
  });
  const manage = usePermission(PERMISSIONS.shopLiveManage);
  const report = usePermission(PERMISSIONS.shopLiveReportRead);
  const [cancel, setCancel] = useState<LiveSession | null>(null);
  const commands = useLiveCommands();
  const columns: ColumnDef<LiveSession>[] = [
    {
      accessorKey: "title",
      header: "Phiên livestream",
      cell: ({ row: { original: s } }) => (
        <div className="max-w-72">
          <Link
            className="font-medium hover:text-primary"
            href={
              platform
                ? ROUTES.livestream.session(s.id)
                : ROUTES.vendor.livestreamStudio(s.id)
            }
          >
            {s.title}
          </Link>
          <p className="text-xs text-muted-foreground">
            {platform
              ? s.shop?.name || "Gian hàng không còn khả dụng"
              : s.mode === "rehearsal"
                ? "Phát thử riêng"
                : "Phát công khai"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "state",
      header: "Trạng thái",
      cell: ({ row }) => <LiveSessionBadge state={row.original.state} />,
    },
    {
      accessorKey: "scheduledAt",
      header: "Lịch phát",
      cell: ({ row }) =>
        formatDateTime(row.original.scheduledAt || row.original.startedAt),
    },
    { accessorKey: "productsCount", header: "Sản phẩm" },
    { accessorKey: "viewerCount", header: "Đang xem" },
    {
      id: "actions",
      header: "",
      cell: ({ row: { original: s } }) => (
        <div className="flex justify-end gap-2">
          {!platform && manage && ["draft", "scheduled"].includes(s.state) ? (
            <>
              <Link
                className="text-sm hover:underline"
                href={ROUTES.vendor.livestreamEdit(s.id)}
              >
                Sửa
              </Link>
              <button
                className="text-sm text-destructive hover:underline"
                onClick={() => setCancel(s)}
              >
                Huỷ
              </button>
            </>
          ) : null}
          {!platform && report ? (
            <Link
              className="text-sm hover:underline"
              href={ROUTES.vendor.livestreamReport(s.id)}
            >
              Dữ liệu
            </Link>
          ) : null}
          <Link
            className="text-sm text-primary hover:underline"
            href={
              platform
                ? ROUTES.livestream.session(s.id)
                : ROUTES.vendor.livestreamStudio(s.id)
            }
          >
            {platform ? "Chi tiết" : "Studio"}
          </Link>
        </div>
      ),
    },
  ];
  if (isForbiddenError(query.error))
    return (
      <ApiErrorState
        error={query.error}
        fallback="Bạn không có quyền xem phiên livestream."
      />
    );
  return (
    <div className="space-y-4">
      <PageHeader
        title={platform ? "Phiên livestream toàn sàn" : "Livestream"}
        description={
          platform
            ? "Giám sát trạng thái phát và xử lý nội dung theo quyền được giao."
            : "Chuẩn bị sản phẩm, kiểm tra hình tiếng rồi phát trực tiếp tới khách hàng."
        }
      >
        <Button
          variant="outline"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCwIcon />
          Làm mới
        </Button>
        {!platform && manage ? (
          <Button
            nativeButton={false}
            render={<Link href={ROUTES.vendor.livestreamNew} />}
          >
            <PlusIcon />
            Tạo phiên
          </Button>
        ) : null}
      </PageHeader>
      {query.error ? (
        <ApiErrorState
          compact
          error={query.error}
          fallback="Chưa tải được danh sách. Thử làm mới."
        />
      ) : null}
      {commands.cancel.error ? (
        <ApiErrorState
          compact
          error={commands.cancel.error}
          fallback="Chưa huỷ được phiên."
        />
      ) : null}
      <DataTable
        columns={columns}
        data={query.data?.content ?? []}
        loading={query.isPending}
        searchValue={state.search}
        onSearchChange={state.setSearch}
        searchPlaceholder="Tìm tên phiên hoặc shop…"
        toolbar={
          <NativeSelect
            aria-label="Trạng thái phiên"
            value={state.filters.state}
            onChange={(e) => state.setFilter("state", e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(LIVE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </NativeSelect>
        }
        serverPagination={{
          pageIndex: state.pageIndex,
          pageCount: query.data?.totalPages ?? 1,
          total: query.data?.totalElements ?? 0,
          pageSize: 15,
          onPageChange: state.setPageIndex,
        }}
      />
      <ConfirmDialog
        open={!!cancel}
        onOpenChange={(open) => {
          if (!open) setCancel(null);
        }}
        title="Huỷ phiên chưa phát?"
        description="Phiên sẽ được đóng và lịch nhắc cũ không còn hiệu lực. Đơn hàng đã có không bị tác động."
        confirmLabel="Huỷ phiên"
        destructive
        onConfirm={() => {
          if (cancel)
            commands.cancel.mutate({ id: cancel.id, version: cancel.version });
        }}
      />
    </div>
  );
}
