"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { InfoIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { formatNumber, formatVnd } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProductAdminResponse } from "@/lib/api/generated/model";
import { useProductScope } from "@/features/product/hooks/use-product-scope";
import {
  resolveProductCategory,
  useCategoryTemplate,
  useLegacyVariantValues,
  useProductCategories,
} from "@/features/product/hooks/use-product-catalog";
import { useSaveVariants } from "@/features/product/hooks/use-products";
import { ProductNotice } from "@/features/product/components/products/product-notice";
import {
  computeRows,
  editRow,
  initialMatrix,
  LEGACY_COLOR_AXIS,
  LEGACY_SIZE_AXIS,
  MAX_VARIANTS,
  removeRow,
  toggleValue,
  toVariantInputs,
  validateRows,
  withUsedValues,
  type MatrixAxis,
  type MatrixState,
} from "@/features/product/schemas/variant-matrix";
import type { AttributeMode, ProductScope, ProductVariantWithActive } from "@/features/product/types/product";

const MAX_AXES = 2;

/*
 * Tab Biến thể. Dựng TRỤ theo kiểu ngành rồi giao cho ma trận:
 * - legacy_fashion: trục Màu sắc + Size lấy từ bộ thuộc tính chung;
 * - dynamic: trục = thuộc tính `isVariantAxis` của mẫu ngành (tối đa 2; không
 *   có trục thì đúng MỘT biến thể mặc định).
 */
export function ProductVariantsEditor({ scope, product }: { scope: ProductScope; product: ProductAdminResponse }) {
  const categories = useProductCategories(scope);
  const category = resolveProductCategory(categories.data, product.categoryId, product);
  const mode: AttributeMode | undefined = category?.attributeMode;
  const { template, isPending: templatePending, error: templateError } = useCategoryTemplate(scope, category);
  const legacyValues = useLegacyVariantValues(mode === "legacy_fashion");

  const axes = useMemo<MatrixAxis[] | undefined>(() => {
    if (mode === "legacy_fashion") {
      if (!legacyValues.data) return undefined;
      return [
        {
          id: LEGACY_COLOR_AXIS,
          name: "Màu sắc",
          values: legacyValues.data.colors.map((c) => ({ id: c.code, label: c.name, hex: c.hex })),
        },
        { id: LEGACY_SIZE_AXIS, name: "Size", values: legacyValues.data.sizes.map((s) => ({ id: s.code, label: s.name })) },
      ];
    }
    if (mode === "dynamic" && template) {
      return template.axes.map((a) => ({
        id: a.attributeId,
        name: a.name,
        values: a.values.map((v) => ({ id: v.id, label: v.value, hex: v.hex })),
      }));
    }
    return undefined;
  }, [mode, legacyValues.data, template]);

  const error = categories.error ?? templateError ?? legacyValues.error;
  if (error) return <ApiErrorState error={error} fallback="Không tải được dữ liệu để dựng biến thể." compact />;
  // Truy vấn màu/size chỉ bật ở ngành legacy: khi bị tắt (enabled=false) React Query vẫn báo isPending=true — không được chờ nó ở ngành dynamic.
  const legacyPending = mode === "legacy_fashion" && legacyValues.isPending;
  if (!mode || !axes || categories.isPending || templatePending || legacyPending) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  const variants: ProductVariantWithActive[] = product.variants;
  // Khoá theo nội dung biến thể trên server: lưu xong (id/SKU mới) thì dựng lại state từ dữ liệu mới.
  const signature = variants.map((v) => `${v.id}:${v.sku}:${v.price.amount}`).join("|");
  return (
    <VariantMatrix
      key={signature}
      scope={scope}
      product={product}
      mode={mode}
      axes={withUsedValues(mode, axes, variants)}
    />
  );
}

function VariantMatrix({
  scope,
  product,
  mode,
  axes,
}: {
  scope: ProductScope;
  product: ProductAdminResponse;
  mode: AttributeMode;
  axes: MatrixAxis[];
}) {
  const { can, stockHref } = useProductScope(scope);
  const save = useSaveVariants(scope, product.id);
  const canEdit = can.update;

  const initial = useMemo(
    () => initialMatrix(mode, axes, product.variants, product.price.amount),
    [mode, axes, product.variants, product.price.amount],
  );
  const [state, setState] = useState<MatrixState>(initial.state);

  const rows = computeRows(axes, state, initial.stock);
  const rowErrors = validateRows(rows);
  const payload = toVariantInputs(mode, axes, rows);
  const initialPayload = toVariantInputs(mode, axes, computeRows(axes, initial.state, initial.stock));
  // Có dòng mới (kể cả biến thể mặc định của ngành không trục — chưa có sẵn thì payload gốc cũng đúng một dòng) hoặc còn biến thể
  // không khớp trục cần dọn đều là thay đổi cần lưu, dù so sánh payload thuần có thể trùng.
  const dirty =
    rows.some((r) => r.stock === null) || initial.unmapped > 0 || JSON.stringify(payload) !== JSON.stringify(initialPayload);
  // Biến thể đang có mà không còn dòng nào ứng với nó → lưu sẽ gỡ (backend từ chối nếu đang giữ hàng / nằm trong phiếu nhập nháp).
  const rowKeys = new Set(rows.map((r) => r.key));
  const removing = [...initial.stock.keys()].filter((k) => !rowKeys.has(k)).length;

  const tooManyAxes = axes.length > MAX_AXES;
  const emptyAxis = axes.find((a) => a.values.length === 0);
  const hasErrors = Object.keys(rowErrors).length > 0;
  const blocked = tooManyAxes || !!emptyAxis || rows.length === 0 || rows.length > MAX_VARIANTS || hasErrors;
  const noAxis = axes.length === 0;

  const selectAll = (axis: MatrixAxis) =>
    setState((s) => axis.values.reduce((acc, v) => (acc.selected[axis.id]?.includes(v.id) ? acc : toggleValue(acc, axis.id, v.id)), s));
  const clearAxis = (axis: MatrixAxis) => setState((s) => ({ ...s, selected: { ...s.selected, [axis.id]: [] } }));

  return (
    <div className="flex flex-col gap-4">
      {initial.unmapped > 0 ? (
        <ProductNotice tone="warning">
          {initial.unmapped} biến thể hiện có không khớp các trục của ngành hàng hiện tại — nếu lưu, chúng sẽ bị gỡ khỏi sản phẩm.
        </ProductNotice>
      ) : null}
      {removing > 0 ? (
        <ProductNotice tone="warning">
          Lưu sẽ gỡ {removing} biến thể đang có khỏi sản phẩm. Biến thể đang giữ hàng cho đơn hoặc nằm trong phiếu nhập kho nháp sẽ bị từ
          chối gỡ.
        </ProductNotice>
      ) : null}
      {tooManyAxes ? (
        <ProductNotice tone="warning">Mẫu thuộc tính của ngành có hơn {MAX_AXES} trục biến thể — nhờ quản trị sàn chỉnh lại mẫu.</ProductNotice>
      ) : null}
      {emptyAxis ? (
        <ProductNotice tone="warning">
          Trục &quot;{emptyAxis.name}&quot; chưa có giá trị nào để chọn — nhờ quản trị sàn bổ sung giá trị cho thuộc tính này.
        </ProductNotice>
      ) : null}

      <div className={cn("grid gap-4", !noAxis && "lg:grid-cols-[16rem_1fr]")}>
        {!noAxis ? (
          <div className="flex flex-col gap-4">
            {axes.map((axis) => {
              const picked = new Set(state.selected[axis.id] ?? []);
              return (
                <Card key={axis.id}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2">
                    <CardTitle className="text-sm">{axis.name}</CardTitle>
                    {canEdit && axis.values.length > 1 ? (
                      <div className="flex gap-2 text-xs">
                        <button type="button" className="text-primary hover:underline" onClick={() => selectAll(axis)}>
                          Chọn hết
                        </button>
                        <button type="button" className="text-muted-foreground hover:underline" onClick={() => clearAxis(axis)}>
                          Bỏ chọn
                        </button>
                      </div>
                    ) : null}
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-1.5">
                    {axis.values.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        disabled={!canEdit}
                        aria-pressed={picked.has(v.id)}
                        onClick={() => setState((s) => toggleValue(s, axis.id, v.id))}
                        className={cn(
                          "inline-flex h-8 min-w-10 items-center justify-center gap-1.5 rounded-md border px-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                          picked.has(v.id) ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
                        )}
                      >
                        {v.hex ? <span className="size-3.5 rounded-full border" style={{ background: v.hex }} /> : null}
                        {v.label}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : null}

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">
              {noAxis ? "Biến thể mặc định" : `${rows.length} biến thể`}
              <span className="ml-2 text-xs font-normal text-muted-foreground">giá sản phẩm {product.price.display}</span>
            </CardTitle>
            {canEdit ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={!dirty || save.isPending} onClick={() => setState(initial.state)}>
                  Hoàn tác
                </Button>
                <Button size="sm" disabled={!dirty || blocked || save.isPending} onClick={() => save.mutate(payload)}>
                  {save.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
                  Lưu biến thể
                </Button>
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  {axes.map((a) => (
                    <TableHead key={a.id}>{a.name}</TableHead>
                  ))}
                  {noAxis ? <TableHead>Biến thể</TableHead> : null}
                  <TableHead>SKU</TableHead>
                  <TableHead>Giá riêng (VND)</TableHead>
                  <TableHead className="text-right">Tồn</TableHead>
                  <TableHead>Bán</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={axes.length + 5} className="h-24 text-center text-sm text-muted-foreground">
                      Chọn ít nhất một giá trị cho MỖI trục ở bên trái để sinh các biến thể.
                    </TableCell>
                  </TableRow>
                ) : null}
                {rows.map((r) => {
                  const err = rowErrors[r.key];
                  return (
                    <TableRow key={r.key} className={cn(r.stock === null && "bg-primary/[0.03]", !r.isActive && "opacity-60")}>
                      {r.values.map((v) => (
                        <TableCell key={v.id} className="font-medium whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            {v.hex ? <span className="size-3 rounded-full border" style={{ background: v.hex }} /> : null}
                            {v.label}
                          </span>
                        </TableCell>
                      ))}
                      {noAxis ? <TableCell className="text-muted-foreground">Không có trục biến thể</TableCell> : null}
                      <TableCell className="align-top">
                        <Input
                          className="h-8 w-40 font-mono text-xs uppercase placeholder:normal-case"
                          placeholder="tự sinh"
                          maxLength={64}
                          aria-label="SKU"
                          aria-invalid={!!err?.sku}
                          disabled={!canEdit}
                          value={r.sku}
                          onChange={(e) => setState((s) => editRow(s, r, { sku: e.target.value }))}
                        />
                        {err?.sku ? <p className="mt-1 max-w-40 text-xs text-destructive">{err.sku}</p> : null}
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          className="h-8 w-36"
                          inputMode="numeric"
                          placeholder={formatVnd(product.price.amount)}
                          aria-label="Giá riêng"
                          aria-invalid={!!err?.price}
                          disabled={!canEdit}
                          value={r.price}
                          onChange={(e) => setState((s) => editRow(s, r, { price: e.target.value.replace(/\D/g, "") }))}
                        />
                        {err?.price ? <p className="mt-1 max-w-36 text-xs text-destructive">{err.price}</p> : null}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.stock === null ? <span className="text-xs text-muted-foreground">mới</span> : formatNumber(r.stock)}
                      </TableCell>
                      <TableCell>
                        <Switch
                          size="sm"
                          aria-label="Bật bán biến thể"
                          disabled={!canEdit}
                          checked={r.isActive}
                          onCheckedChange={(v) => setState((s) => editRow(s, r, { isActive: v }))}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {canEdit && !noAxis ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive"
                            title="Bỏ tổ hợp này"
                            aria-label="Bỏ tổ hợp này"
                            onClick={() => setState((s) => removeRow(s, r.key))}
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex flex-col gap-2 px-4 pb-4">
              {rows.length > MAX_VARIANTS ? (
                <ProductNotice tone="warning">
                  {rows.length} tổ hợp vượt giới hạn {MAX_VARIANTS} biến thể mỗi sản phẩm — bỏ bớt giá trị đã chọn.
                </ProductNotice>
              ) : null}
              {save.isError ? <ApiErrorState error={save.error} fallback="Lưu biến thể thất bại." compact /> : null}
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  SKU để trống thì hệ thống tự sinh (duy nhất trong shop). Giá riêng để trống = theo giá sản phẩm. Lưu không xoá tồn kho:
                  biến thể giữ nguyên tổ hợp được cập nhật tại chỗ. Số tồn không sửa ở đây — nhập kho / điều chỉnh ở{" "}
                  <Link href={stockHref} className="text-primary hover:underline">
                    màn Kho
                  </Link>
                  .
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
