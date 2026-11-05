import { z } from "zod";
import type { VariantInput } from "@/lib/api/generated/model";
import type { AttributeMode, ProductVariantWithActive } from "@/features/product/types/product";
import { MAX_VND } from "@/features/product/schemas/product-schema";

/*
 * Ma trận biến thể — logic THUẦN (không React) cho cả hai kiểu ngành:
 * - legacy_fashion: 2 trục cố định MÀU × SIZE → gửi `colorCode` / `sizeCode`;
 * - dynamic: các TRỤ BIẾN THỂ của mẫu ngành (tối đa 2; 0 trục = đúng MỘT biến
 *   thể không options) → gửi `options:[{attributeId, attributeValueId}]`.
 *
 * Mô hình: danh sách tổ hợp TƯỜNG MINH (`combos`, mỗi phần tử là khoá dòng). Người
 * dùng tick giá trị trên từng trục vào vùng chọn (`selected`) rồi bấm "Thêm tổ hợp":
 * các tổ hợp (tích đề-các của phần đã tick) được nối vào `combos`. Nhờ vậy chọn được
 * từng cặp tuỳ ý (Trắng-XS + Đen-S) mà không bị sinh thừa Trắng-S / Đen-XS. Sửa
 * SKU / giá / bật-tắt lưu riêng theo khoá dòng (`edits`). Dòng được TÍNH từ state.
 *
 * Backend khớp biến thể cũ theo TỔ HỢP (không xoá-tạo lại) → giữ id + tồn kho;
 * vì vậy khoá dòng chỉ cần ổn định theo tổ hợp, không cần id biến thể.
 */

export const MAX_VARIANTS = 200;
const NO_AXIS_KEY = "default";

export interface MatrixAxisValue {
  id: string;
  label: string;
  hex?: string | null;
}

export interface MatrixAxis {
  /** legacy: "color" | "size"; dynamic: attributeId. */
  id: string;
  name: string;
  values: MatrixAxisValue[];
}

export interface RowEdit {
  sku: string;
  /** Chữ số VND; "" = theo giá sản phẩm. */
  price: string;
  isActive: boolean;
  weightGram?: string;
  lengthCm?: string;
  widthCm?: string;
  heightCm?: string;
}

export interface MatrixState {
  /** Vùng chọn tạm: giá trị đã tick trên từng trục, chưa thành dòng cho tới khi bấm "Thêm tổ hợp". */
  selected: Record<string, string[]>;
  /** Khoá các tổ hợp (dòng) hiện có, theo thứ tự thêm. */
  combos: string[];
  edits: Record<string, RowEdit>;
}

export interface MatrixRow extends RowEdit {
  key: string;
  values: MatrixAxisValue[];
  /** Tồn thô của biến thể đã có; null = tổ hợp mới. */
  stock: number | null;
}

export const LEGACY_COLOR_AXIS = "color";
export const LEGACY_SIZE_AXIS = "size";

export const rowKey = (ids: string[]) => (ids.length > 0 ? ids.join("|") : NO_AXIS_KEY);

/* Giá trị các trục (theo thứ tự trục) của một biến thể đã có; null nếu không biểu diễn được trên các trục hiện tại. */
function variantValueIds(mode: AttributeMode, axes: MatrixAxis[], v: ProductVariantWithActive): string[] | null {
  if (mode === "legacy_fashion") return v.colorCode && v.size ? [v.colorCode, v.size] : null;
  const byAxis = new Map((v.options ?? []).map((o) => [o.attributeId, o.attributeValueId]));
  const ids = axes.map((a) => byAxis.get(a.id));
  return ids.every((id): id is string => !!id) ? ids : null;
}

/* Nhãn hiển thị của giá trị đã dùng trong biến thể (phòng khi giá trị đã bị tắt/xoá khỏi danh mục nên không còn trong trục). */
function variantValueLabel(mode: AttributeMode, axes: MatrixAxis[], axisIndex: number, v: ProductVariantWithActive, id: string): string {
  if (mode === "legacy_fashion") return axisIndex === 0 ? (v.color ?? id) : id;
  return v.options?.find((o) => o.attributeId === axes[axisIndex].id)?.displayValue ?? id;
}

/* Bổ sung vào mỗi trục những giá trị biến thể hiện có đang dùng mà danh mục không còn — để không mất dòng khi lưu. */
export function withUsedValues(mode: AttributeMode, axes: MatrixAxis[], variants: ProductVariantWithActive[]): MatrixAxis[] {
  return axes.map((axis, i) => {
    const known = new Set(axis.values.map((v) => v.id));
    const extra: MatrixAxisValue[] = [];
    for (const v of variants) {
      const ids = variantValueIds(mode, axes, v);
      const id = ids?.[i];
      if (id && !known.has(id)) {
        known.add(id);
        extra.push({ id, label: variantValueLabel(mode, axes, i, v, id) });
      }
    }
    return extra.length ? { ...axis, values: [...axis.values, ...extra] } : axis;
  });
}

function combinations(axes: MatrixAxis[], selected: Record<string, string[]>): MatrixAxisValue[][] {
  let combos: MatrixAxisValue[][] = [[]];
  for (const axis of axes) {
    const picked = axis.values.filter((v) => selected[axis.id]?.includes(v.id));
    combos = combos.flatMap((prefix) => picked.map((v) => [...prefix, v]));
  }
  return combos;
}

export interface InitialMatrix {
  state: MatrixState;
  /** Tồn thô theo khoá dòng của các biến thể đã có. */
  stock: Map<string, number>;
  /** Số biến thể đã có nhưng không khớp trục hiện tại (lưu sẽ gỡ chúng). */
  unmapped: number;
}

export function initialMatrix(
  mode: AttributeMode,
  axes: MatrixAxis[],
  variants: ProductVariantWithActive[],
  productPrice: string,
): InitialMatrix {
  const stock = new Map<string, number>();
  const edits: Record<string, RowEdit> = {};
  let unmapped = 0;

  for (const v of variants) {
    const ids = variantValueIds(mode, axes, v);
    if (!ids) {
      unmapped += 1;
      continue;
    }
    const key = rowKey(ids);
    stock.set(key, v.stock);
    edits[key] = {
      sku: v.sku,
      // Giá trả về luôn là giá hiệu lực — bằng giá sản phẩm thì coi như "theo giá sản phẩm".
      price: Number(v.price.amount) === Number(productPrice) ? "" : v.price.amount,
      isActive: v.isActive ?? true,
      weightGram: v.weightGram?.toString() ?? "",
      lengthCm: v.lengthCm?.toString() ?? "",
      widthCm: v.widthCm?.toString() ?? "",
      heightCm: v.heightCm?.toString() ?? "",
    };
  }

  return { state: { selected: Object.fromEntries(axes.map((a) => [a.id, [] as string[]])), combos: [...stock.keys()], edits }, stock, unmapped };
}

export function computeRows(axes: MatrixAxis[], state: MatrixState, stock: Map<string, number>): MatrixRow[] {
  const rowOf = (key: string, values: MatrixAxisValue[]): MatrixRow => {
    const edit = state.edits[key] ?? { sku: "", price: "", isActive: true };
    return { key, values, ...edit, stock: stock.get(key) ?? null };
  };
  // Ngành không có trục: luôn đúng MỘT dòng mặc định.
  if (axes.length === 0) return [rowOf(NO_AXIS_KEY, [])];
  return state.combos.flatMap((key) => {
    const ids = key.split("|");
    const values = axes.map((a, i) => a.values.find((v) => v.id === ids[i]));
    return values.every((v): v is MatrixAxisValue => !!v) ? [rowOf(key, values)] : [];
  });
}

export function toggleValue(state: MatrixState, axisId: string, valueId: string): MatrixState {
  const current = state.selected[axisId] ?? [];
  const next = current.includes(valueId) ? current.filter((id) => id !== valueId) : [...current, valueId];
  return { ...state, selected: { ...state.selected, [axisId]: next } };
}

/* Tổ hợp mà vùng chọn sẽ thêm (chưa có trong `combos`); rỗng nếu một trục chưa tick giá trị nào. */
export function pendingCombos(axes: MatrixAxis[], state: MatrixState): string[] {
  const have = new Set(state.combos);
  return combinations(axes, state.selected)
    .map((c) => rowKey(c.map((v) => v.id)))
    .filter((k) => !have.has(k));
}

/* Nối các tổ hợp của vùng chọn vào danh sách dòng rồi xoá vùng chọn. */
export function addSelectedCombos(axes: MatrixAxis[], state: MatrixState): MatrixState {
  return {
    ...state,
    combos: [...state.combos, ...pendingCombos(axes, state)],
    selected: Object.fromEntries(axes.map((a) => [a.id, [] as string[]])),
  };
}

export function editRow(state: MatrixState, row: MatrixRow, patch: Partial<RowEdit>): MatrixState {
  const base: RowEdit = state.edits[row.key] ?? { sku: row.sku, price: row.price, isActive: row.isActive };
  return { ...state, edits: { ...state.edits, [row.key]: { ...base, ...patch } } };
}

export function removeRow(state: MatrixState, key: string): MatrixState {
  return { ...state, combos: state.combos.filter((k) => k !== key) };
}

/* Dòng → body PUT …/variants. SKU trống = bỏ khỏi body (backend giữ SKU cũ / tự sinh cho biến thể mới). */
export function toVariantInputs(mode: AttributeMode, axes: MatrixAxis[], rows: MatrixRow[]): VariantInput[] {
  return rows.map((r): VariantInput => {
    const common = { sku: r.sku.trim() || undefined, price: r.price || null, isActive: r.isActive,
      weightGram: r.weightGram ? Number(r.weightGram) : null,
      lengthCm: r.lengthCm ? Number(r.lengthCm) : null,
      widthCm: r.widthCm ? Number(r.widthCm) : null,
      heightCm: r.heightCm ? Number(r.heightCm) : null,
    };
    return mode === "legacy_fashion"
      ? { colorCode: r.values[0].id, sizeCode: r.values[1].id, ...common }
      : { options: axes.map((a, i) => ({ attributeId: a.id, attributeValueId: r.values[i].id })), ...common };
  });
}

const skuSchema = z
  .string()
  .trim()
  .max(64, "SKU tối đa 64 ký tự")
  .regex(/^[A-Za-z0-9-]*$/, "SKU chỉ gồm chữ, số và dấu gạch ngang");

const priceSchema = z
  .string()
  .regex(/^\d*$/, "Giá riêng chỉ gồm chữ số")
  .refine((v) => v === "" || (Number(v) > 0 && Number(v) <= MAX_VND), "Giá riêng phải lớn hơn 0 và ≤ 99.999.999.999.999");

export interface RowErrors {
  sku?: string;
  price?: string;
  weightGram?: string;
  lengthCm?: string;
  widthCm?: string;
  heightCm?: string;
}

/* Lỗi theo khoá dòng. SKU duy nhất TRONG shop nên ở đây chỉ bắt được trùng trong chính danh sách đang lưu. */
export function validateRows(rows: MatrixRow[]): Record<string, RowErrors> {
  const errors: Record<string, RowErrors> = {};
  const firstOf = new Map<string, string>();

  for (const r of rows) {
    const e: RowErrors = {};
    const sku = skuSchema.safeParse(r.sku);
    if (!sku.success) e.sku = sku.error.issues[0]?.message;
    const price = priceSchema.safeParse(r.price);
    if (!price.success) e.price = price.error.issues[0]?.message;
    for (const key of ["weightGram", "lengthCm", "widthCm", "heightCm"] as const) {
      const raw = r[key];
      const max = key === "weightGram" ? 19_999 : 200;
      if (raw && (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > max)) e[key] = `Nhập số nguyên từ 1 đến ${max}`;
    }

    const normalized = r.sku.trim().toUpperCase();
    if (normalized && !e.sku) {
      const first = firstOf.get(normalized);
      if (first !== undefined) {
        e.sku = "SKU bị trùng trong danh sách";
        errors[first] = { ...errors[first], sku: "SKU bị trùng trong danh sách" };
      } else {
        firstOf.set(normalized, r.key);
      }
    }
    if (Object.values(e).some(Boolean)) errors[r.key] = { ...errors[r.key], ...e };
  }
  return errors;
}
