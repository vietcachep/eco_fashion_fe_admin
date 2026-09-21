"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminCategoryControllerCreate,
  adminCategoryControllerImage,
  adminCategoryControllerRemove,
  adminCategoryControllerUpdate,
  useAdminCategoryControllerList,
} from "@/lib/api/generated/admin-catalog/admin-catalog";
import type { CreateCategoryRequest, UpdateCategoryRequest } from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";

/*
 * Ngành hàng (cây cha–con). Danh sách admin trả TOÀN BỘ (ít, ổn định) →
 * dựng cây ở client. Mọi mutation invalidate cả /admin/categories lẫn
 * /categories công khai (dropdown chọn ngành ở form sản phẩm dùng bản admin).
 */
const PATH = "/api/v1/admin/categories";

export function useAdminCategories() {
  return useAdminCategoryControllerList({ query: { staleTime: 60_000 } });
}

function useCategoryMutation<TVars>(
  fn: (vars: TVars) => Promise<unknown>,
  success: string,
  failure: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      invalidateByPath(qc, PATH, "/api/v1/categories");
      toast.success(success);
    },
    onError: (e) => toast.error(apiErrorMessage(e, failure)),
  });
}

export function useCreateCategory() {
  return useCategoryMutation(
    (body: CreateCategoryRequest) => adminCategoryControllerCreate(body),
    "Đã tạo ngành hàng.",
    "Tạo ngành hàng thất bại.",
  );
}

export function useUpdateCategory() {
  return useCategoryMutation(
    ({ id, body }: { id: string; body: UpdateCategoryRequest }) => adminCategoryControllerUpdate(id, body),
    "Đã cập nhật ngành hàng.",
    "Cập nhật thất bại.",
  );
}

export function useRemoveCategory() {
  return useCategoryMutation(
    (id: string) => adminCategoryControllerRemove(id),
    "Đã xoá ngành hàng.",
    "Xoá thất bại — ngành hàng còn sản phẩm hoặc ngành con?",
  );
}

export function useUploadCategoryImage() {
  return useCategoryMutation(
    ({ id, file }: { id: string; file: File }) => adminCategoryControllerImage(id, { file }),
    "Đã cập nhật ảnh ngành hàng.",
    "Tải ảnh thất bại.",
  );
}
