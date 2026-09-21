"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { formatDateTime, formatNumber } from "@/lib/format";
import { useStockMovements } from "@/features/product/hooks/use-inventory";
import type { StockRowResponse } from "@/lib/api/generated/model";

const TYPE_LABEL: Record<string, string> = {
  receipt: "Nhập kho",
  adjust: "Điều chỉnh",
  reserve: "Giữ cho đơn",
  release: "Nhả giữ",
  deduct: "Trừ khi giao",
  return: "Trả hàng",
};

/* Sổ kho của một biến thể — mọi biến động tồn (nhập, điều chỉnh, giữ/nhả/trừ theo đơn). */
export function StockMovementsDialog({ row, onClose }: { row: StockRowResponse | null; onClose: () => void }) {
  const { data, isPending, error } = useStockMovements(row?.variantId ?? "");

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sổ kho — {row?.productName}</DialogTitle>
          <DialogDescription>
            {row?.color} · {row?.size} · <code className="font-mono">{row?.sku}</code> · tồn hiện tại {formatNumber(row?.stock)}
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <ApiErrorState error={error} fallback="Không tải được sổ kho." compact />
        ) : isPending ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead className="text-right">Số lượng</TableHead>
                  <TableHead className="text-right">Tồn sau</TableHead>
                  <TableHead>Tham chiếu / ghi chú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">
                      Chưa có biến động.
                    </TableCell>
                  </TableRow>
                ) : null}
                {(data ?? []).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</TableCell>
                    <TableCell>{TYPE_LABEL[m.type] ?? m.type}</TableCell>
                    <TableCell className={m.quantity < 0 ? "text-right text-destructive" : "text-right text-emerald-700"}>
                      {m.quantity > 0 ? "+" : ""}
                      {formatNumber(m.quantity)}
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(m.stockAfter)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.refType ? `${m.refType} ${m.refId ?? ""}` : ""}
                      {m.note ? ` ${m.note}` : ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
