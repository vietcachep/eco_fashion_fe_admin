import { z } from "zod";
import type { DefaultValues } from "react-hook-form";
import type {
  AttributeValueInput,
  CreateProductRequest,
  ProductAdminResponse,
  UpdateProductRequest,
} from "@/lib/api/generated/model";
import type { ProductTemplate } from "@/features/product/types/product";

/*
 * Form sản phẩm (Create/UpdateProductRequest + PUT …/attributes). Dùng chung hai cổng.
 * Giá là CHUỖI số nguyên VND ở backend (> 0, ≤ 99.999.999.999.999) — form nhập
 * số rồi đổi sang chuỗi khi gửi. care nhập mỗi dòng một mục; tags phẩy/xuống dòng.
 *
 * Luật phụ thuộc NGÀNH HÀNG nên schema là hàm dựng theo ngữ cảnh:
 * - legacy_fashion: giới tính + chất liệu + bảo quản bắt buộc (backend 400 nếu thiếu);
 * - dynamic: thuộc tính theo mẫu ngành. Thuộc tính `required` KHÔNG chặn ở đây —
 *   backend chỉ đòi lúc ĐĂNG BÁN (tạo luôn ở trạng thái nháp), nên form cho lưu thiếu.
 * - tags/isNew/isFeatured chỉ có ở cổng sàn (vendor không đặt được).
 */
export const MAX_VND = 99_999_999_999_999;
const MAX_CARE_ITEMS = 10;
const MAX_TAGS = 10;
const MAX_TEXT_ATTRIBUTE = 255;

const price = z
  .number({ message: "Nhập số tiền" })
  .int("Số nguyên VND")
  .positive("Giá phải lớn hơn 0")
  .max(MAX_VND, "Vượt giới hạn cho phép");

const baseSchema = z.object({
  name: z.string().trim().min(3, "Tên 3–200 ký tự").max(200, "Tên 3–200 ký tự"),
  slug: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v), "Slug chỉ gồm a-z, 0-9 và dấu gạch ngang")
    .refine((v) => v.length <= 160, "Slug tối đa 160 ký tự"),
  categoryId: z.string().min(1, "Chọn ngành hàng cấp cuối"),
  gender: z.enum(["", "nam", "nu", "unisex"]),
  basePrice: price,
  /* Ô trống = undefined (register setValueAs) — không phải NaN. */
  listPrice: price.optional(),
  shortDescription: z.string().trim().max(500, "Tối đa 500 ký tự"),
  description: z.string().trim().max(20_000, "Tối đa 20.000 ký tự"),
  material: z.string().trim().max(200, "Tối đa 200 ký tự"),
  care: z.string().max(2000, "Quá dài"),
  tags: z.string().max(500, "Quá dài"),
  isNew: z.boolean(),
  isFeatured: z.boolean(),
  /* attributeId → attributeValueId (select) hoặc giá trị nhập tay (text/number). */
  attributes: z.record(z.string(), z.string()),
});

export type ProductInput = z.infer<typeof baseSchema>;

/* Tách "a\nb" → ["a","b"] — bảo quản có thể chứa dấu phẩy nên chỉ tách theo dòng. */
export function splitLines(s: string): string[] {
  return s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

/* Tách "a, b\nc" → ["a","b","c"] */
export function splitList(s: string): string[] {
  return s
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/* `setValueAs` cho ô số tuỳ chọn: để trống → undefined (không phải NaN). */
export function optionalNumber(v: unknown): number | undefined {
  return v === "" || v === null || v === undefined ? undefined : Number(v);
}

export interface ProductContext {
  /** Ngành đang chọn là legacy_fashion (form thời trang cũ). */
  legacy: boolean;
  /** Cổng sàn mới có tags / isNew / isFeatured. */
  platform: boolean;
  template: ProductTemplate;
}

export function buildProductSchema({ legacy, platform, template }: ProductContext) {
  const numberIds = template.fields.filter((f) => f.inputType === "number").map((f) => f.attributeId);

  return baseSchema.superRefine((v, ctx) => {
    if (v.listPrice !== undefined && v.basePrice && v.listPrice <= v.basePrice) {
      ctx.addIssue({ code: "custom", path: ["listPrice"], message: "Giá gốc phải lớn hơn giá bán (hoặc để trống)" });
    }

    if (legacy) {
      if (!v.gender) ctx.addIssue({ code: "custom", path: ["gender"], message: "Chọn giới tính" });
      if (!v.material.trim()) ctx.addIssue({ code: "custom", path: ["material"], message: "Nhập chất liệu" });
      const care = splitLines(v.care);
      if (care.length === 0) {
        ctx.addIssue({ code: "custom", path: ["care"], message: "Nhập ít nhất một hướng dẫn bảo quản" });
      } else if (care.length > MAX_CARE_ITEMS || care.some((c) => c.length > 120)) {
        ctx.addIssue({ code: "custom", path: ["care"], message: `Tối đa ${MAX_CARE_ITEMS} dòng, mỗi dòng ≤ 120 ký tự` });
      }
    }

    if (platform) {
      const tags = splitList(v.tags);
      if (tags.length > MAX_TAGS || tags.some((t) => !/^[a-z0-9-]+$/.test(t))) {
        ctx.addIssue({
          code: "custom",
          path: ["tags"],
          message: `Tối đa ${MAX_TAGS} tag, chỉ gồm a-z, 0-9 và dấu gạch ngang`,
        });
      }
    }

    for (const [id, raw] of Object.entries(v.attributes)) {
      const value = raw.trim();
      if (value.length > MAX_TEXT_ATTRIBUTE) {
        ctx.addIssue({ code: "custom", path: ["attributes", id], message: `Tối đa ${MAX_TEXT_ATTRIBUTE} ký tự` });
      } else if (numberIds.includes(id) && value && !Number.isFinite(Number(value))) {
        ctx.addIssue({ code: "custom", path: ["attributes", id], message: "Nhập số hợp lệ" });
      }
    }
  });
}

/* Giá trị form → danh sách thuộc tính gửi backend; mỗi dòng ĐÚNG MỘT trong attributeValueId / customValue. */
export function buildAttributeValues(values: Record<string, string>, template: ProductTemplate): AttributeValueInput[] {
  return template.fields.flatMap((f): AttributeValueInput[] => {
    const raw = (values[f.attributeId] ?? "").trim();
    if (!raw) return [];
    return f.inputType === "select"
      ? [{ attributeId: f.attributeId, attributeValueId: raw }]
      : [{ attributeId: f.attributeId, customValue: raw }];
  });
}

export function buildCreateBody(input: ProductInput, { legacy, platform, template }: ProductContext): CreateProductRequest {
  return {
    name: input.name,
    slug: input.slug || undefined,
    categoryId: input.categoryId,
    basePrice: String(input.basePrice),
    listPrice: input.listPrice ? String(input.listPrice) : undefined,
    shortDescription: input.shortDescription || undefined,
    description: input.description || undefined,
    ...(legacy
      ? { gender: input.gender || undefined, material: input.material.trim(), care: splitLines(input.care) }
      : { attributeValues: buildAttributeValues(input.attributes, template) }),
    ...(platform ? { tags: splitList(input.tags), isNew: input.isNew, isFeatured: input.isFeatured } : {}),
  };
}

export function buildUpdateBody(input: ProductInput, { legacy, platform }: ProductContext): UpdateProductRequest {
  return {
    name: input.name,
    slug: input.slug || undefined,
    categoryId: input.categoryId,
    basePrice: String(input.basePrice),
    listPrice: input.listPrice ? String(input.listPrice) : null,
    shortDescription: input.shortDescription || null,
    description: input.description || null,
    ...(legacy
      ? { gender: input.gender || undefined, material: input.material.trim() || null, care: splitLines(input.care) }
      : {}),
    ...(platform ? { tags: splitList(input.tags), isNew: input.isNew, isFeatured: input.isFeatured } : {}),
  };
}

/* Form tạo mới: giá để trống (không phải 0) để gõ thẳng số vào ô, khỏi dính số 0 đầu. */
export function emptyProductInput(): DefaultValues<ProductInput> {
  return {
    name: "",
    slug: "",
    categoryId: "",
    gender: "",
    basePrice: undefined,
    listPrice: undefined,
    shortDescription: "",
    description: "",
    material: "",
    care: "",
    tags: "",
    isNew: false,
    isFeatured: false,
    attributes: {},
  };
}

/*
 * Response chi tiết → giá trị form. Thuộc tính: select giữ attributeValueId,
 * text/number giữ chữ đã nhập (backend trả ở `value`). Giá trị `gender` của sản
 * phẩm ngành dynamic (backend mặc định "unisex") vô nghĩa nên chỉ nạp khi hợp lệ.
 */
export function productToInput(product: ProductAdminResponse): ProductInput {
  const gender = (["nam", "nu", "unisex"] as const).find((g) => g === product.gender) ?? "";
  return {
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    gender,
    basePrice: Number(product.price.amount),
    listPrice: product.listPrice ? Number(product.listPrice.amount) : undefined,
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    material: product.material ?? "",
    care: product.care.join("\n"),
    tags: product.tags.join(", "),
    isNew: product.isNew,
    isFeatured: product.isFeatured,
    attributes: Object.fromEntries(
      (product.attributeValues ?? []).map((a) => [a.attributeId, a.attributeValueId ?? a.value ?? ""]),
    ),
  };
}
