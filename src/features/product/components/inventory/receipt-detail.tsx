"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CheckIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailList } from "@/components/shared/detail-list";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDateTime, formatNumber } from "@/lib/format";
import { RECEIPT_STATUS, statusMeta } from "@/lib/labels";
import { usePostReceipt, useReceipt } from "@/features/product/hooks/use-inventory";

const LOAD_ERROR = "Không tải được phiếu nhập.";

/* Chi tiết phiếu nhập: dòng hàng + nút "Ghi sổ" (cộng tồn, idempotent, không hoàn tác). */
export function ReceiptDetail({ id }: { id: string }) {
  const { data: r, isPending, error } = useReceipt(id);
  const post = usePostReceipt(id);
  const [confirm, setConfirm] = useState(false);

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;
  if (isPending || !r) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }
  const status = statusMeta(RECEIPT_STATUS, r.status);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={`Phiếu nhập ${r.code}`} description={r.supplierName ? `Nhà cung cấp: ${r.supplierName}` : undefined}>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        <Button variant="outline" nativeButton={false} render={<Link href={ROUTES.product.receipts} />}>
          <ArrowLeftIcon className="size-4" />
          Danh sách
        </Button>
        {r.status === "draft" ? (
          <PermissionGate permission={PERMISSIONS.inventoryReceive}>
            <Button onClick={() => setConfirm(true)} disabled={post.isPending}>
              {post.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}
              Ghi sổ nhập kho
            </Button>
          </PermissionGate>
        ) : null}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Hàng nhập ({r.items.length} dòng)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Số lượng</TableHead>
                  <TableHead className="text-right">Giá vốn</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.items.map((i) => (
                  <TableRow key={i.variantId}>
                    <TableCell className="font-mono text-sm">{i.sku}</TableCell>
                    <TableCell className="text-right">{formatNumber(i.quantity)}</TableCell>
                    <TableCell className="text-right">{i.unitCost.display}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end border-t px-4 py-3 text-sm">
              Tổng vốn: <b className="ml-2">{r.totalCost.display}</b>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông tin</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList
              rows={[
                { label: "Mã phiếu", value: <code className="font-mono">{r.code}</code> },
                { label: "Nhà cung cấp", value: r.supplierName || "—" },
                { label: "Ghi chú", value: r.note || "—" },
                { label: "Tạo lúc", value: formatDateTime(r.createdAt) },
                { label: "Ghi sổ lúc", value: formatDateTime(r.postedAt) },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Ghi sổ phiếu nhập?"
        description={`Cộng ${formatNumber(r.items.reduce((s, i) => s + i.quantity, 0))} sản phẩm vào tồn kho. Không hoàn tác được — sai thì lập phiếu điều chỉnh.`}
        confirmLabel="Ghi sổ"
        onConfirm={() => post.mutate()}
      />
    </div>
  );
}
