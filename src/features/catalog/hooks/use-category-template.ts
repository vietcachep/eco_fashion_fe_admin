"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminCategoryAttributeControllerSetTemplate,
  useAdminCategoryAttributeControllerGetTemplate,
} from "@/lib/api/generated/admin-catalog/admin-catalog";
import type { SetCategoryAttributeTemplateRequest } from "@/lib/api/generated/model";
import { invalidateByPath } from "@/lib/query-invalidate";
import type { CategoryTemplateRow } from "@/features/catalog/schemas/category-template-schema";

/*
 * Mẫu thuộc tính của một ngành `dynamic` (PLAN-0016): danh sách thuộc tính + bắt buộc + trục biến thể.
 * GET trả mẫu rỗng cho ngành legacy (không lỗi); PUT mới 409 CATALOG_CATEGORY_NOT_DYNAMIC.
 *
 * Làm mới sau khi lưu: danh sách ngành (số liệu), `/shop/catalog` (vendor đọc mẫu để dựng form đăng
 * bán) và `/categories` công khai.
 */
export function useCategoryTemplate(categoryId: string, enabled = true) {
  return useAdminCategoryAttributeControllerGetTemplate(categoryId, {
    query: { enabled, staleTime: 30_000 },
  });
}

/* Form → request: thứ tự dòng trong form là sortOrder; `inputType`/`name` chỉ dùng kiểm ở FE nên bỏ. */
function toSetTemplateRequest(rows: CategoryTemplateRow[]): SetCategoryAttributeTemplateRequest {
  return {
    attributes: rows.map((r, index) => ({
      attributeId: r.attributeId,
      required: r.required,
      isVariantAxis: r.isVariantAxis,
      sortOrder: index,
    })),
  };
}

/*
 * Không toast lỗi ở đây: lỗi 4xx của backend (trục biến thể, ngành đã có sản phẩm, ngành không phải
 * dynamic…) được hộp thoại hiện nguyên văn ngay trong form — toast biến mất, còn người dùng cần đọc để sửa.
 */
export function useSetCategoryTemplate(categoryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: CategoryTemplateRow[]) =>
      adminCategoryAttributeControllerSetTemplate(categoryId, toSetTemplateRequest(rows)),
    onSuccess: () => {
      invalidateByPath(qc, "/api/v1/admin/categories", "/api/v1/shop/catalog", "/api/v1/categories");
      toast.success("Đã lưu mẫu thuộc tính của ngành.");
    },
  });
}
