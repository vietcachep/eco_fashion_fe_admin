"use client";
import { useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { NativeSelect } from "@/components/shared/native-select";
import { useListState } from "@/hooks/use-list-state";
import { usePermission } from "@/hooks/use-permission";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { isForbiddenError } from "@/lib/api-error";
import {
  useLiveCommands,
  useLiveContentReports,
} from "../../hooks/use-livestream";
import type { ContentReport } from "../../types/live";

const DEFAULTS = { status: "" };
export function LiveContentReports() {
  const state = useListState(DEFAULTS);
  const query = useLiveContentReports(state.page, state.filters.status);
  const [selected, setSelected] = useState<ContentReport | null>(null);
  const process = usePermission(PERMISSIONS.liveReportProcess);
  const readSession = usePermission(PERMISSIONS.liveRead);
  const columns: ColumnDef<ContentReport>[] = [
    {
      accessorKey: "reason",
      header: "Nội dung báo cáo",
      cell: ({ row }) => (
        <div className="max-w-80">
          <p className="font-medium">{row.original.reason}</p>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {row.original.description}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Trạng thái",
      cell: ({ row }) =>
        ({
          pending: "Chờ xử lý",
          resolved: "Đã xử lý",
          dismissed: "Đã bỏ qua",
        })[row.original.status] || row.original.status,
    },
    {
      accessorKey: "createdAt",
      header: "Tiếp nhận",
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      id: "action",
      header: "",
      cell: ({ row }) => (
        <div className="flex gap-3">
          {readSession ? (
            <Link
              className="text-sm text-primary hover:underline"
              href={ROUTES.livestream.session(row.original.sessionId)}
            >
              Xem phiên
            </Link>
          ) : null}
          {process && row.original.status === "pending" ? (
            <button
              className="text-sm hover:underline"
              onClick={() => setSelected(row.original)}
            >
              Xử lý
            </button>
          ) : null}
        </div>
      ),
    },
  ];
  if (isForbiddenError(query.error))
    return (
      <ApiErrorState
        error={query.error}
        fallback="Bạn không có quyền xem báo cáo livestream."
      />
    );
  return (
    <div className="space-y-4">
      <PageHeader
        title="Báo cáo nội dung livestream"
        description="Báo cáo của người xem được xử lý độc lập với việc buộc dừng phiên."
      >
        <Button variant="outline" onClick={() => void query.refetch()}>
          Làm mới
        </Button>
      </PageHeader>
      {query.error ? (
        <ApiErrorState error={query.error} fallback="Không tải được báo cáo." />
      ) : null}
      <DataTable
        columns={columns}
        data={query.data?.content ?? []}
        loading={query.isPending}
        toolbar={
          <NativeSelect
            aria-label="Trạng thái báo cáo"
            value={state.filters.status}
            onChange={(e) => state.setFilter("status", e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="pending">Chờ xử lý</option>
            <option value="resolved">Đã xử lý</option>
            <option value="dismissed">Đã bỏ qua</option>
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
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xử lý báo cáo</DialogTitle>
            <DialogDescription>
              Ghi kết quả xem xét. Muốn buộc dừng video, mở chi tiết phiên và
              dùng đúng quyền.
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <ProcessForm
              key={selected.id}
              report={selected}
              onDone={() => setSelected(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function ProcessForm({
  report,
  onDone,
}: {
  report: ContentReport;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const commands = useLiveCommands();
  return (
    <div className="space-y-3">
      <p className="text-sm">{report.reason}</p>
      <p className="text-sm text-muted-foreground">{report.description}</p>
      <Textarea
        aria-label="Kết quả xem xét"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={1000}
        placeholder="Kết quả kiểm tra và lý do"
      />
      {commands.processReport.error ? (
        <ApiErrorState
          error={commands.processReport.error}
          fallback="Không cập nhật được báo cáo."
        />
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          disabled={commands.processReport.isPending || note.trim().length < 5}
          onClick={() =>
            commands.processReport.mutate(
              { id: report.id, decision: "dismissed", note },
              { onSuccess: onDone },
            )
          }
        >
          Bỏ qua báo cáo
        </Button>
        <Button
          disabled={commands.processReport.isPending || note.trim().length < 5}
          onClick={() =>
            commands.processReport.mutate(
              { id: report.id, decision: "resolved", note },
              { onSuccess: onDone },
            )
          }
        >
          Đánh dấu đã xử lý
        </Button>
      </div>
    </div>
  );
}
