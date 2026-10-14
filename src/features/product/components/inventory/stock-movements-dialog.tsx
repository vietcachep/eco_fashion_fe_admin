"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime, formatNumber } from "@/lib/format";
import { statusMeta, STOCK_MOVEMENT_TYPE } from "@/lib/labels";
import { useStockMovements } from "@/features/product/hooks/use-inventory";
import { variantLabel, type InventoryScope } from "@/features/product/types/inventory";
import type { StockMovementResponse, StockRowResponse } from "@/lib/api/generated/model";

/* Tham chiếu của một biến động: phiếu nhập / đơn hàng / lý do điều chỉnh (note). */
function movementRef(m: StockMovementResponse): string {
  const parts: string[] = [];
  if (m.refType === "stock_receipt" && m.refId) parts.push(`Phiếu nhập ${m.refId}`);
  else if (m.refType === "order" && m.refId) parts.push(`Đơn ${m.refId}`);
  else if (m.refType && m.refType !== "adjust") parts.push(`${m.refType} ${m.refId ?? ""}`.trim());
  if (m.note) parts.push(m.note);
  return parts.join(" · ");
}

/* Sổ kho của một biến thể — mọi biến động tồn (nhập, điều chỉnh, giữ/nhả/trừ theo đơn). */
export function StockMovementsDialog({
  scope,
  row,
  onClose,
}: {
  scope: InventoryScope;
  row: StockRowResponse | null;
  onClose: () => void;
}) {
  const { data, isPending, error } = useStockMovements(scope, row?.variantId ?? "");
  const label = row ? variantLabel(row) : "";

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sổ kho — {row?.productName}</DialogTitle>
          <DialogDescription>
            {label ? `${label} · ` : ""}
            <code className="font-mono">{row?.sku}</code> · tồn hiện tại {formatNumber(row?.stock)}
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
                {(data ?? []).map((m) => {
                  const type = statusMeta(STOCK_MOVEMENT_TYPE, m.type);
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(m.createdAt)}</TableCell>
                      <TableCell>
                        <StatusBadge tone={type.tone}>{type.label}</StatusBadge>
                      </TableCell>
                      <TableCell className={m.quantity < 0 ? "text-right text-destructive" : "text-right text-emerald-700"}>
                        {m.quantity > 0 ? "+" : ""}
                        {formatNumber(m.quantity)}
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(m.stockAfter)}</TableCell>
                      <TableCell className="min-w-40 text-xs whitespace-normal text-muted-foreground">{movementRef(m)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
