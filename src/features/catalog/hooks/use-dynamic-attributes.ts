"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminDynamicAttributeControllerAddValue,
  adminDynamicAttributeControllerCreate,
  adminDynamicAttributeControllerDeleteValue,
  adminDynamicAttributeControllerUpdateValue,
  useAdminDynamicAttributeControllerList,
} from "@/lib/api/generated/admin-catalog/admin-catalog";
import type {
  CreateDynamicAttributeRequest,
  DynamicAttributeResponse,
} from "@/lib/api/generated/model";
import { apiErrorCode, apiErrorMessage, apiMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";

/*
 * Thuộc tính động (PLAN-0016) — kho thuộc tính dùng chung cho mọi ngành `dynamic`.
 *
 * Danh sách: backend trả CẢ MẢNG (~50 thuộc tính, mỗi thuộc tính kèm giá trị), không phân trang →
 * tải một lần, cache 5 phút, tìm/lọc/phân trang ở client (màn hình).
 *
 * Sau mọi ghi phải làm mới thêm: mẫu của ngành (`/admin/categories/{id}/attributes`) nhúng cả giá trị
 * thuộc tính, và vendor đọc mẫu qua `/shop/catalog/...` — nếu không làm mới, form đăng bán còn giá trị cũ.
 */
const PATH = "/api/v1/admin/dynamic-attributes";
const RELATED = ["/api/v1/admin/categories", "/api/v1/shop/catalog"];

/* Danh sách theo tên (backend sắp theo ngày tạo giảm dần — khó dò khi có ~50 thuộc tính). */
export function useDynamicAttributes(enabled = true) {
  return useAdminDynamicAttributeControllerList({
    query: {
      enabled,
      staleTime: 5 * 60_000,
      select: (list) => [...list].sort((a, b) => a.name.localeCompare(b.name, "vi")),
    },
  });
}

/* `extra` của giá trị là object `{ hex }` (màu) hoặc null — đọc bằng `unknown` + thu hẹp kiểu để chịu được dữ liệu cũ/lạ. */
export function valueHex(extra: unknown): string | null {
  if (typeof extra === "object" && extra !== null && "hex" in extra) {
    const hex = extra.hex;
    if (typeof hex === "string" && /^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  }
  return null;
}

const COLOR_HINT = /colou?r|màu|(^|[\s_-])mau([\s_-]|$)/i;

/* Thuộc tính "màu": mã/tên gợi màu, hoặc đã có giá trị mang hex → form giá trị hiện ô chọn màu. */
export function isColorAttribute(attr: Pick<DynamicAttributeResponse, "code" | "name" | "values">): boolean {
  return COLOR_HINT.test(`${attr.code} ${attr.name}`) || attr.values.some((v) => valueHex(v.extra) !== null);
}

/* Dữ liệu form giá trị đã chuẩn hoá: hex `undefined` = không đụng `extra`, "" = xoá màu, "#RRGGBB" = đặt màu. */
interface DynamicAttributeValuePayload {
  value: string;
  sortOrder: number;
  hex?: string;
}

/*
 * Dữ liệu phụ của giá trị: màu ⇒ `{hex}`; xoá màu ⇒ `null` (backend ghi NULL vào cột Json — đã xử lý bằng Prisma.DbNull).
 * Kiểu do Orval sinh khớp backend (object | null), không cần ép kiểu.
 */
function extraBody(hex: string): { [key: string]: unknown } | null {
  return hex ? { hex } : null;
}

/* Lỗi xoá giá trị đang dùng (409) — nói rõ phải làm gì thay vì chỉ lặp lại câu của backend. */
function attributeErrorMessage(e: unknown, fallback: string): string {
  if (apiErrorCode(e) === "CATALOG_ATTRIBUTE_VALUE_IN_USE") {
    return `${apiMessage(e) ?? "Giá trị đang được sản phẩm/biến thể sử dụng."} Không xoá được — hãy đổi tên giá trị thay vì xoá.`;
  }
  return apiErrorMessage(e, fallback);
}

export function useCreateDynamicAttribute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDynamicAttributeRequest) => adminDynamicAttributeControllerCreate(body),
    onSuccess: () => {
      invalidateByPath(qc, PATH);
      toast.success("Đã tạo thuộc tính.");
    },
    onError: (e) => toast.error(attributeErrorMessage(e, "Tạo thuộc tính thất bại.")),
  });
}

function useValueMutation<TVars>(
  fn: (vars: TVars) => Promise<unknown>,
  success: string,
  failure: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      invalidateByPath(qc, PATH, ...RELATED);
      toast.success(success);
    },
    onError: (e) => toast.error(attributeErrorMessage(e, failure)),
  });
}

export function useAddDynamicAttributeValue(attributeId: string) {
  return useValueMutation(
    ({ value, sortOrder, hex }: DynamicAttributeValuePayload) =>
      adminDynamicAttributeControllerAddValue(attributeId, { value, sortOrder, ...(hex ? { extra: extraBody(hex) } : {}) }),
    "Đã thêm giá trị.",
    "Thêm giá trị thất bại.",
  );
}

export function useUpdateDynamicAttributeValue(attributeId: string) {
  return useValueMutation(
    ({ valueId, payload }: { valueId: string; payload: DynamicAttributeValuePayload }) =>
      adminDynamicAttributeControllerUpdateValue(attributeId, valueId, {
        value: payload.value,
        sortOrder: payload.sortOrder,
        ...(payload.hex !== undefined ? { extra: extraBody(payload.hex) } : {}),
      }),
    "Đã cập nhật giá trị.",
    "Cập nhật giá trị thất bại.",
  );
}

export function useDeleteDynamicAttributeValue(attributeId: string) {
  return useValueMutation(
    (valueId: string) => adminDynamicAttributeControllerDeleteValue(attributeId, valueId),
    "Đã xoá giá trị.",
    "Xoá giá trị thất bại.",
  );
}
