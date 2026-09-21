"use client";

import { useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

/*
 * Reusable data table (TanStack Table) for every list screen.
 * - Default (client) mode: filtering + pagination over the supplied rows.
 * - Server mode: pass `serverPagination` (the parent owns page state + total
 *   from the API) and `onSearchChange` (controlled keyword) — the table then
 *   renders exactly the page it's given and delegates paging/search upward
 *   (Rule 1: server-side pagination for real list APIs).
 * `loading` shows skeleton rows. Existing client-mode callers are unchanged.
 */
interface ServerPagination {
  /** 0-based page index. */
  pageIndex: number;
  pageCount: number;
  total: number;
  /**
   * Số dòng MỖI TRANG mà màn gửi lên server (không phải số dòng trang đang xem).
   *
   * BẮT BUỘC có, vì dòng "Hiển thị X–Y trong Z" cần biết vị trí bắt đầu của
   * trang: `X = pageIndex * pageSize + 1`. Trước đây chỗ này lấy `data.length`
   * (số dòng trang hiện tại) làm cỡ trang — trang đầy thì trùng nhau nên đúng,
   * nhưng TRANG CUỐI lẻ dòng thì cỡ trang bị hiểu sai theo. Ví dụ thật: 9 người
   * dùng, 8 dòng/trang → trang 2 hiện "2–2 trong 9" thay vì "9–9 trong 9".
   */
  pageSize: number;
  onPageChange: (pageIndex: number) => void;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageSize?: number;
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  loading?: boolean;
  /** Provide to switch to server-driven pagination. */
  serverPagination?: ServerPagination;
  /** Provide to make the search box controlled + server-driven. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageSize = 10,
  searchPlaceholder,
  toolbar,
  loading = false,
  serverPagination,
  searchValue,
  onSearchChange,
}: DataTableProps<TData, TValue>) {
  const [globalFilter, setGlobalFilter] = useState("");
  const serverSearch = !!onSearchChange;
  const serverPaged = !!serverPagination;

  const table = useReactTable({
    data,
    columns,
    state: serverSearch ? {} : { globalFilter },
    onGlobalFilterChange: serverSearch ? undefined : setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    ...(serverSearch ? {} : { getFilteredRowModel: getFilteredRowModel() }),
    ...(serverPaged
      ? { manualPagination: true, pageCount: serverPagination.pageCount }
      : {
          getPaginationRowModel: getPaginationRowModel(),
          initialState: { pagination: { pageSize } },
        }),
  });

  // Footer numbers — from the server response, or computed client-side.
  const clientTotal = table.getFilteredRowModel().rows.length;
  const { pageIndex: clientPageIndex, pageSize: ps } =
    table.getState().pagination;
  const total = serverPaged ? serverPagination.total : clientTotal;
  const pageIndex = serverPaged ? serverPagination.pageIndex : clientPageIndex;
  const pageCount = serverPaged
    ? serverPagination.pageCount
    : table.getPageCount() || 1;
  /*
   * Vị trí dòng đầu/cuối của trang đang xem.
   * Chế độ server: cỡ trang lấy từ `serverPagination.pageSize` — KHÔNG lấy
   * `data.length`, vì trang cuối lẻ dòng sẽ làm lệch cả vị trí bắt đầu.
   * Chế độ client: TanStack tự quản cỡ trang qua `ps`.
   */
  const size = serverPaged ? serverPagination.pageSize : ps;
  const start = total === 0 ? 0 : pageIndex * size + 1;
  const end = serverPaged
    ? pageIndex * size + data.length
    : Math.min((pageIndex + 1) * size, total);

  const goPrev = () =>
    serverPaged
      ? serverPagination.onPageChange(pageIndex - 1)
      : table.previousPage();
  const goNext = () =>
    serverPaged
      ? serverPagination.onPageChange(pageIndex + 1)
      : table.nextPage();
  const canPrev = serverPaged ? pageIndex > 0 : table.getCanPreviousPage();
  const canNext = serverPaged
    ? pageIndex < pageCount - 1
    : table.getCanNextPage();

  const rows = table.getRowModel().rows;

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar: search + actions */}
      {(searchPlaceholder || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {searchPlaceholder ? (
            <div className="relative w-full max-w-xs">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={serverSearch ? (searchValue ?? "") : globalFilter}
                onChange={(e) =>
                  serverSearch
                    ? onSearchChange(e.target.value)
                    : setGlobalFilter(e.target.value)
                }
                placeholder={searchPlaceholder}
                className="h-9 rounded-lg pl-9"
              />
            </div>
          ) : (
            <span />
          )}
          {toolbar ? (
            <div className="flex items-center gap-2">{toolbar}</div>
          ) : null}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="h-10">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="hover:bg-transparent">
                  {columns.map((_c, j) => (
                    <TableCell key={j} className="py-2.5">
                      <Skeleton className="h-5 w-full max-w-45 rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2.5">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Không có dữ liệu.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          Hiển thị {start}–{end} trong {total}
        </span>
        <div className="flex items-center gap-2">
          <span>
            Trang {pageIndex + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={goPrev}
            disabled={!canPrev}
            aria-label="Trang trước"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={goNext}
            disabled={!canNext}
            aria-label="Trang sau"
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
