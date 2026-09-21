"use client";

import { useMemo, useState } from "react";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PERMISSIONS } from "@/lib/constants";
import { formatNumber, formatVnd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePermission } from "@/hooks/use-permission";
import { useAttributes } from "@/features/catalog/hooks/use-attributes";
import { useSaveVariants } from "@/features/product/hooks/use-products";
import type { ProductAdminResponse, VariantInput } from "@/lib/api/generated/model";

interface Row extends VariantInput {
  key: string;
  colorName: string;
  stock: number | null;
  existing: boolean;
}

/*
 * Biến thể = MÀU × SIZE. Bên trái tick màu và size từ bộ thuộc tính; ma trận
 * bên phải là các tổ hợp: SKU (trống = backend tự sinh), giá riêng (trống =
 * theo giá sản phẩm). Lưu = PUT toàn bộ (backend giữ tồn kho của biến thể cũ
 * theo màu+size; biến thể còn tồn không xoá được — backend báo).
 */
export function ProductVariantsEditor({ product }: { product: ProductAdminResponse }) {
  const { data: attrs, isPending } = useAttributes();
  const save = useSaveVariants(product.id);
  const canEdit = usePermission(PERMISSIONS.productUpdate);

  const colors = useMemo(() => attrs?.find((a) => a.kind === "color")?.values.filter((v) => v.isActive) ?? [], [attrs]);
  const sizes = useMemo(() => attrs?.find((a) => a.kind === "size")?.values.filter((v) => v.isActive) ?? [], [attrs]);

  const initialRows = useMemo<Row[]>(
    () =>
      product.variants.map((v) => ({
        key: `${v.colorCode}|${v.size}`,
        colorCode: v.colorCode,
        colorName: v.color,
        sizeCode: v.size,
        sku: v.sku,
        price: Number(v.price.amount) === Number(product.price.amount) ? null : v.price.amount,
        isActive: true,
        stock: v.stock,
        existing: true,
      })),
    [product],
  );

  const [rows, setRows] = useState<Row[]>(initialRows);
  const selectedColors = new Set(rows.map((r) => r.colorCode));
  const selectedSizes = new Set(rows.map((r) => r.sizeCode));

  const toggleColor = (code: string, name: string) => {
    if (selectedColors.has(code)) {
      setRows((prev) => prev.filter((r) => r.colorCode !== code));
    } else {
      const sizeList = selectedSizes.size ? [...selectedSizes] : sizes.slice(0, 1).map((s) => s.code);
      setRows((prev) => [
        ...prev,
        ...sizeList.map((s) => ({ key: `${code}|${s}`, colorCode: code, colorName: name, sizeCode: s, sku: "", price: null, isActive: true, stock: null, existing: false })),
      ]);
    }
  };

  const toggleSize = (code: string) => {
    if (selectedSizes.has(code)) {
      setRows((prev) => prev.filter((r) => r.sizeCode !== code));
    } else {
      const colorList = selectedColors.size
        ? [...selectedColors].map((c) => ({ code: c, name: rows.find((r) => r.colorCode === c)?.colorName ?? c }))
        : colors.slice(0, 1).map((c) => ({ code: c.code, name: c.name }));
      setRows((prev) => [
        ...prev,
        ...colorList.map((c) => ({ key: `${c.code}|${code}`, colorCode: c.code, colorName: c.name, sizeCode: code, sku: "", price: null, isActive: true, stock: null, existing: false })),
      ]);
    }
  };

  const update = (key: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const dirty = JSON.stringify(rows.map(strip)) !== JSON.stringify(initialRows.map(strip));

  if (isPending) return <Skeleton className="h-96 w-full rounded-xl" />;

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Màu sắc</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {colors.map((c) => (
              <label key={c.code} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox disabled={!canEdit} checked={selectedColors.has(c.code)} onCheckedChange={() => toggleColor(c.code, c.name)} />
                <span className="size-3.5 rounded-full border" style={{ background: c.hex ?? "#fff" }} />
                {c.name}
              </label>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Size</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {sizes.map((s) => (
              <button
                key={s.code}
                type="button"
                disabled={!canEdit}
                onClick={() => toggleSize(s.code)}
                className={cn(
                  "h-8 min-w-10 rounded-md border px-2 text-sm font-medium transition-colors",
                  selectedSizes.has(s.code) ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
                )}
              >
                {s.name}
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {rows.length} biến thể
            <span className="ml-2 text-xs font-normal text-muted-foreground">giá sản phẩm {product.price.display}</span>
          </CardTitle>
          <PermissionGate permission={PERMISSIONS.productUpdate}>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!dirty || save.isPending} onClick={() => setRows(initialRows)}>
                Hoàn tác
              </Button>
              <Button size="sm" disabled={!dirty || save.isPending || rows.length === 0} onClick={() => save.mutate(rows.map(strip))}>
                {save.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
                Lưu biến thể
              </Button>
            </div>
          </PermissionGate>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Màu</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Giá riêng (VND)</TableHead>
                <TableHead className="text-right">Tồn</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                    Tick màu và size ở bên trái để tạo biến thể.
                  </TableCell>
                </TableRow>
              ) : null}
              {rows.map((r) => (
                <TableRow key={r.key} className={cn(!r.existing && "bg-primary/[0.03]")}>
                  <TableCell className="font-medium">{r.colorName}</TableCell>
                  <TableCell>{r.sizeCode}</TableCell>
                  <TableCell>
                    <Input
                      className="h-8 font-mono text-xs"
                      placeholder="tự sinh"
                      disabled={!canEdit}
                      value={r.sku ?? ""}
                      onChange={(e) => update(r.key, { sku: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8"
                      type="number"
                      min={0}
                      step={1000}
                      placeholder={formatVnd(product.price.amount)}
                      disabled={!canEdit}
                      value={r.price ?? ""}
                      onChange={(e) => update(r.key, { price: e.target.value ? e.target.value : null })}
                    />
                  </TableCell>
                  <TableCell className="text-right">{r.stock === null ? <span className="text-xs text-muted-foreground">mới</span> : formatNumber(r.stock)}</TableCell>
                  <TableCell className="text-right">
                    {canEdit ? (
                      <Button variant="ghost" size="icon" className="size-7 text-destructive" title="Bỏ biến thể" onClick={() => setRows((p) => p.filter((x) => x.key !== r.key))}>
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function strip(r: Row): VariantInput {
  return { colorCode: r.colorCode, sizeCode: r.sizeCode, sku: r.sku || undefined, price: r.price || null, isActive: r.isActive ?? true };
}
