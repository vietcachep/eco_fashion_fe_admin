"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminProductControllerCreate,
  adminProductControllerHide,
  adminProductControllerPublish,
  adminProductControllerRemove,
  adminProductControllerUpdate,
  adminProductControllerVariants,
  adminProductImageControllerRemove,
  adminProductImageControllerReorder,
  adminProductImageControllerUpdate,
  adminProductImageControllerUpload,
  useAdminProductControllerGet,
  useAdminProductControllerList,
} from "@/lib/api/generated/admin-products/admin-products";
import type {
  CreateProductRequest,
  UpdateImageRequest,
  UpdateProductRequest,
  VariantInput,
} from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";
import type { ProductListItem } from "@/features/product/types/product";

/*
 * Sản phẩm (khu quản trị) — bọc hook Orval tag admin-products. Danh sách phân
 * trang server (`page`/`pageSize`, khác các module khác dùng `size`). Mutation
 * nào cũng invalidate cả danh sách lẫn chi tiết + bảng tồn kho (biến thể đổi
 * là tồn đổi) + trang công khai /products (web bán hàng đọc cùng cache nếu
 * cùng trình duyệt — không đáng kể nhưng đúng).
 */
const PATH = "/api/v1/admin/products";
const STOCK_PATH = "/api/v1/admin/inventory";

export interface AdminProductsQuery {
  keyword?: string;
  status?: string;
  category?: string;
  gender?: string;
  page: number;
  pageSize: number;
}

export function useAdminProducts({ keyword, status, category, gender, page, pageSize }: AdminProductsQuery) {
  return useAdminProductControllerList(
    {
      q: keyword || undefined,
      status: (status || undefined) as never,
      category: category || undefined,
      gender: (gender || undefined) as never,
      sort: "newest",
      page,
      pageSize,
    },
    {
      query: {
        select: (res) => asPage<ProductListItem>(res),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
      },
    },
  );
}

export function useAdminProduct(id: string) {
  return useAdminProductControllerGet(id, { query: { enabled: !!id, staleTime: 15_000 } });
}

function useProductMutation<TVars, TRes>(
  fn: (vars: TVars) => Promise<TRes>,
  success: string | null,
  failure: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      invalidateByPath(qc, PATH, STOCK_PATH, "/api/v1/products");
      if (success) toast.success(success);
    },
    onError: (e) => toast.error(apiErrorMessage(e, failure)),
  });
}

export function useCreateProduct() {
  return useProductMutation(
    (body: CreateProductRequest) => adminProductControllerCreate(body),
    "Đã tạo sản phẩm (trạng thái nháp).",
    "Tạo sản phẩm thất bại.",
  );
}

export function useUpdateProduct(id: string) {
  return useProductMutation(
    (body: UpdateProductRequest) => adminProductControllerUpdate(id, body),
    "Đã lưu sản phẩm.",
    "Lưu sản phẩm thất bại.",
  );
}

export function useRemoveProduct() {
  return useProductMutation(
    (id: string) => adminProductControllerRemove(id),
    "Đã xoá sản phẩm.",
    "Xoá sản phẩm thất bại.",
  );
}

/* Thay TOÀN BỘ bộ biến thể (PUT). Biến thể có tồn kho không xoá được — backend báo. */
export function useSaveVariants(id: string) {
  return useProductMutation(
    (variants: VariantInput[]) => adminProductControllerVariants(id, { variants }),
    "Đã lưu biến thể.",
    "Lưu biến thể thất bại.",
  );
}

export function usePublishProduct(id: string) {
  return useProductMutation(
    () => adminProductControllerPublish(id),
    "Đã đăng bán sản phẩm.",
    "Đăng bán thất bại — sản phẩm cần có biến thể, ảnh và giá.",
  );
}

export function useHideProduct(id: string) {
  return useProductMutation(() => adminProductControllerHide(id), "Đã ẩn sản phẩm.", "Ẩn sản phẩm thất bại.");
}

export function useUploadProductImage(id: string) {
  return useProductMutation(
    ({ file, colorCode, isPrimary }: { file: File; colorCode?: string; isPrimary?: boolean }) =>
      adminProductImageControllerUpload(id, {
        file,
        colorCode: colorCode || undefined,
        isPrimary: isPrimary ? "true" : undefined,
      }),
    "Đã tải ảnh lên.",
    "Tải ảnh thất bại.",
  );
}

export function useUpdateProductImage(id: string) {
  return useProductMutation(
    ({ imageId, body }: { imageId: string; body: UpdateImageRequest }) =>
      adminProductImageControllerUpdate(id, imageId, body),
    null,
    "Cập nhật ảnh thất bại.",
  );
}

export function useRemoveProductImage(id: string) {
  return useProductMutation(
    (imageId: string) => adminProductImageControllerRemove(id, imageId),
    "Đã xoá ảnh.",
    "Xoá ảnh thất bại.",
  );
}

export function useReorderProductImages(id: string) {
  return useProductMutation(
    (imageIds: string[]) => adminProductImageControllerReorder(id, { imageIds }),
    null,
    "Đổi thứ tự ảnh thất bại.",
  );
}
