"use client";

import {
  useAdminCategoryAttributeControllerGetTemplate,
  useAdminCategoryControllerList,
} from "@/lib/api/generated/admin-catalog/admin-catalog";
import { useAttributeControllerList } from "@/lib/api/generated/catalog/catalog";
import {
  useShopCatalogControllerAttributeTemplate,
  useShopCatalogControllerLeaves,
} from "@/lib/api/generated/shops/shops";
import type {
  AttributeValueResponse,
  CategoryAdminResponse,
  CategoryAttributeDetail,
  ProductAdminResponse,
  ShopLeafCategoryResponse,
  ShopTemplateAttributeResponse,
} from "@/lib/api/generated/model";
import type {
  AttributeMode,
  ProductCategoryOption,
  ProductScope,
  ProductTemplate,
} from "@/features/product/types/product";

/*
 * Dữ liệu NGÀNH HÀNG cho màn sản phẩm — bọc endpoint catalog của TỪNG cổng:
 * - vendor: /shop/catalog/categories/leaves + /:slug/attribute-template (vendor
 *   không có quyền catalog.* của khu quản trị sàn);
 * - sàn: /admin/categories (cả cây, tự lọc ra ngành lá) + /:id/attributes.
 * Cả hai được chuẩn hoá về `ProductCategoryOption` / `ProductTemplate` để
 * component không biết mình đang ở cổng nào. Bọc ở ĐÂY (không import hook của
 * feature catalog) đúng luật "feature không import internals của feature khác".
 */

const MODE_STALE = 5 * 60_000;
const TEMPLATE_STALE = 30_000;

const toMode = (raw: string): AttributeMode => (raw === "dynamic" ? "dynamic" : "legacy_fashion");

/*
 * Backend chỉ cho gán sản phẩm vào ngành LÁ đang bật (400 PRODUCT_CATEGORY_INVALID
 * "Chỉ gán sản phẩm vào ngành hàng cấp cuối"): đang bật, không có ngành con
 * (kể cả con đang ẩn), và mọi ngành tổ tiên đều đang bật.
 */
function leavesFromTree(all: CategoryAdminResponse[]): ProductCategoryOption[] {
  const byId = new Map(all.map((c) => [c.id, c]));
  const parentIds = new Set(all.map((c) => c.parentId).filter((id): id is string => !!id));
  const options: ProductCategoryOption[] = [];

  for (const c of all) {
    if (!c.isActive || parentIds.has(c.id)) continue;
    const chain: CategoryAdminResponse[] = []; // gần → xa
    for (let cur = c.parentId ? byId.get(c.parentId) : undefined; cur && chain.length < 10; ) {
      chain.push(cur);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    if (chain.some((a) => !a.isActive)) continue;
    options.push({
      id: c.id,
      slug: c.slug,
      name: c.name,
      path: [...chain].reverse().map((a) => a.name).concat(c.name).join(" › "),
      attributeMode: toMode(c.attributeMode),
    });
  }
  return options.sort((a, b) => a.path.localeCompare(b.path, "vi"));
}

const fromShopLeaf = (l: ShopLeafCategoryResponse): ProductCategoryOption => ({
  id: l.id,
  slug: l.slug,
  name: l.name,
  path: l.path,
  attributeMode: toMode(l.attributeMode),
});

/*
 * Danh sách ngành LÁ chọn được khi tạo/sửa sản phẩm — cũng dùng làm bộ lọc ngành ở danh sách.
 * Trả dạng chuẩn hoá `{ data, isPending, error }` (không trả nguyên query) vì hai nguồn
 * có kiểu khác nhau, TS không thu hẹp được `isPending` trên union của chúng.
 */
export function useProductCategories(scope: ProductScope): {
  data: ProductCategoryOption[] | undefined;
  isPending: boolean;
  error: unknown;
} {
  const vendor = useShopCatalogControllerLeaves({
    query: { enabled: scope === "vendor", staleTime: MODE_STALE, select: (rows) => rows.map(fromShopLeaf) },
  });
  const platform = useAdminCategoryControllerList({
    query: { enabled: scope === "platform", staleTime: MODE_STALE, select: leavesFromTree },
  });
  const q = scope === "vendor" ? vendor : platform;
  return { data: q.data, isPending: q.isPending, error: q.error };
}

/*
 * Ngành của một sản phẩm đã có. Thường nằm trong danh sách ngành lá; riêng ngành
 * đã bị TẮT thì không còn trong đó nên dựng tạm từ slug (tên = slug) và đoán
 * kiểu từ dữ liệu sản phẩm: có thuộc tính / options là dynamic, có chất liệu /
 * bảo quản là thời trang. Chọn id khác id sản phẩm thì chỉ tra trong danh sách.
 */
export function resolveProductCategory(
  options: ProductCategoryOption[] | undefined,
  categoryId: string,
  product?: ProductAdminResponse,
): ProductCategoryOption | undefined {
  const found = options?.find((o) => o.id === categoryId);
  if (found || !product || categoryId !== product.categoryId) return found;

  const looksDynamic =
    (product.attributeValues?.length ?? 0) > 0 || product.variants.some((v) => (v.options?.length ?? 0) > 0);
  const looksFashion = !!product.material || product.care.length > 0;
  return {
    id: product.categoryId,
    slug: product.categorySlug,
    name: product.categorySlug,
    path: product.categorySlug,
    attributeMode: looksDynamic || !looksFashion ? "dynamic" : "legacy_fashion",
  };
}

/* `extra` của giá trị thuộc tính là JSON tự do theo thuộc tính — chỉ lấy `hex` khi đúng là chuỗi màu. */
function hexOf(extra: unknown): string | null {
  if (extra && typeof extra === "object" && "hex" in extra) {
    const hex = (extra as { hex: unknown }).hex;
    return typeof hex === "string" ? hex : null;
  }
  return typeof extra === "string" && extra.startsWith("#") ? extra : null;
}

const fromAdminAttribute = (c: CategoryAttributeDetail): ShopTemplateAttributeResponse => ({
  attributeId: c.attributeId,
  code: c.attribute.code,
  name: c.attribute.name,
  inputType: c.attribute.inputType,
  required: c.required,
  isVariantAxis: c.isVariantAxis,
  sortOrder: c.sortOrder,
  values:
    c.attribute.inputType === "select"
      ? [...c.attribute.values]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((v) => ({ id: v.id, value: v.value, hex: hexOf(v.extra) }))
      : [],
});

function toTemplate(list: ShopTemplateAttributeResponse[]): ProductTemplate {
  const sorted = [...list].sort((a, b) => a.sortOrder - b.sortOrder);
  return { fields: sorted.filter((a) => !a.isVariantAxis), axes: sorted.filter((a) => a.isVariantAxis) };
}

const EMPTY_TEMPLATE: ProductTemplate = { fields: [], axes: [] };

/*
 * Mẫu thuộc tính của ngành. Ngành thời trang (legacy_fashion) không có mẫu —
 * không gọi API, trả mẫu rỗng ngay. Chưa chọn ngành cũng vậy.
 * Mẫu không cache phía server (admin sửa mẫu là thấy ngay) nên staleTime ngắn.
 */
export function useCategoryTemplate(scope: ProductScope, category: ProductCategoryOption | undefined) {
  const dynamic = category?.attributeMode === "dynamic";
  const vendor = useShopCatalogControllerAttributeTemplate(category?.slug ?? "", {
    query: {
      enabled: scope === "vendor" && dynamic,
      staleTime: TEMPLATE_STALE,
      select: (r) => toTemplate(r.attributes),
    },
  });
  const platform = useAdminCategoryAttributeControllerGetTemplate(category?.id ?? "", {
    query: {
      enabled: scope === "platform" && dynamic,
      staleTime: TEMPLATE_STALE,
      select: (r) => toTemplate(r.attributes.map(fromAdminAttribute)),
    },
  });

  if (!dynamic) return { template: EMPTY_TEMPLATE, isPending: false, error: null as unknown };
  const q = scope === "vendor" ? vendor : platform;
  return { template: q.data, isPending: q.isPending, error: q.error as unknown };
}

/*
 * Màu + size cho biến thể ngành thời trang (legacy_fashion): endpoint công khai
 * GET /attributes (backend chỉ có 3 bộ cố định). Chỉ lấy giá trị đang bật.
 */
export interface LegacyVariantValues {
  colors: AttributeValueResponse[];
  sizes: AttributeValueResponse[];
}

export function useLegacyVariantValues(enabled: boolean) {
  return useAttributeControllerList({
    query: {
      enabled,
      staleTime: MODE_STALE,
      select: (list): LegacyVariantValues => ({
        colors: list.find((a) => a.kind === "color")?.values.filter((v) => v.isActive) ?? [],
        sizes: list.find((a) => a.kind === "size")?.values.filter((v) => v.isActive) ?? [],
      }),
    },
  });
}
