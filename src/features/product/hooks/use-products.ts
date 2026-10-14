"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminProductControllerAttributes,
  adminProductControllerCreate,
  adminProductControllerGet,
  adminProductControllerHide,
  adminProductControllerList,
  adminProductControllerPublish,
  adminProductControllerRemove,
  adminProductControllerUpdate,
  adminProductControllerVariants,
  adminProductImageControllerRemove,
  adminProductImageControllerReorder,
  adminProductImageControllerUpdate,
  adminProductImageControllerUpload,
  getAdminProductControllerGetQueryKey,
  getAdminProductControllerListQueryKey,
} from "@/lib/api/generated/admin-products/admin-products";
import {
  getShopProductControllerGetQueryKey,
  getShopProductControllerListQueryKey,
  shopProductControllerAttributes,
  shopProductControllerCreate,
  shopProductControllerGet,
  shopProductControllerHide,
  shopProductControllerList,
  shopProductControllerPublish,
  shopProductControllerRemove,
  shopProductControllerUpdate,
  shopProductControllerVariants,
  shopProductImageControllerRemove,
  shopProductImageControllerReorder,
  shopProductImageControllerUpdate,
  shopProductImageControllerUpload,
} from "@/lib/api/generated/shops/shops";
import type {
  AttributeValueInput,
  CreateProductRequest,
  ProductAdminResponse,
  ShopProductControllerListParams,
  ShopProductControllerListStatus,
  UpdateImageRequest,
  UpdateProductRequest,
  VariantInput,
} from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";
import type { ProductListItem, ProductScope } from "@/features/product/types/product";

/*
 * Sản phẩm — MỘT bộ hook cho hai cổng, rẽ nhánh theo `scope` ngay tại đây để
 * component không biết endpoint nào:
 * - "platform" → /admin/products* (tag admin-products, quyền product.product.*)
 * - "vendor"   → /shop/products*  (tag shops, quyền shop.product.*; shopId backend
 *   suy từ JWT nên sản phẩm của shop khác = 404)
 * Hai bên có cùng hình dạng request/response (vendor chỉ thiếu tags / isNew /
 * isFeatured — quyền của sàn, form vendor không gửi). Danh sách phân trang
 * server `page`/`pageSize` (khác các module khác dùng `size`).
 *
 * Mutation nào cũng làm mới cả danh sách lẫn chi tiết + kho (biến thể đổi là
 * tồn đổi) + trang công khai /products. Làm mới ở `onSettled` (kể cả khi lỗi):
 * 409 thường do dữ liệu đã đổi dưới chân mình nên cần đọc lại.
 */

interface ProductImageUpload {
  file: File;
  colorCode?: string;
  isPrimary?: boolean;
}

interface ProductEndpoints {
  basePath: string;
  inventoryPath: string;
  create: (body: CreateProductRequest) => Promise<ProductAdminResponse>;
  update: (id: string, body: UpdateProductRequest) => Promise<ProductAdminResponse>;
  remove: (id: string) => Promise<void>;
  variants: (id: string, variants: VariantInput[]) => Promise<ProductAdminResponse>;
  attributes: (id: string, attributeValues: AttributeValueInput[]) => Promise<ProductAdminResponse>;
  publish: (id: string) => Promise<ProductAdminResponse>;
  hide: (id: string) => Promise<ProductAdminResponse>;
  uploadImage: (id: string, body: ProductImageUpload) => Promise<ProductAdminResponse>;
  updateImage: (id: string, imageId: string, body: UpdateImageRequest) => Promise<ProductAdminResponse>;
  removeImage: (id: string, imageId: string) => Promise<ProductAdminResponse>;
  reorderImages: (id: string, imageIds: string[]) => Promise<ProductAdminResponse>;
}

/* Multipart: `isPrimary` là chuỗi "true" (form-data không có boolean). */
const uploadFields = ({ file, colorCode, isPrimary }: ProductImageUpload) => ({
  file,
  colorCode: colorCode || undefined,
  isPrimary: isPrimary ? "true" : undefined,
});

const PLATFORM: ProductEndpoints = {
  basePath: "/api/v1/admin/products",
  inventoryPath: "/api/v1/admin/inventory",
  create: (body) => adminProductControllerCreate(body),
  update: (id, body) => adminProductControllerUpdate(id, body),
  remove: (id) => adminProductControllerRemove(id),
  variants: (id, variants) => adminProductControllerVariants(id, { variants }),
  attributes: (id, attributeValues) => adminProductControllerAttributes(id, { attributeValues }),
  publish: (id) => adminProductControllerPublish(id),
  hide: (id) => adminProductControllerHide(id),
  uploadImage: (id, body) => adminProductImageControllerUpload(id, uploadFields(body)),
  updateImage: (id, imageId, body) => adminProductImageControllerUpdate(id, imageId, body),
  removeImage: (id, imageId) => adminProductImageControllerRemove(id, imageId),
  reorderImages: (id, imageIds) => adminProductImageControllerReorder(id, { imageIds }),
};

const VENDOR: ProductEndpoints = {
  basePath: "/api/v1/shop/products",
  inventoryPath: "/api/v1/shop/inventory",
  create: (body) => shopProductControllerCreate(body),
  update: (id, body) => shopProductControllerUpdate(id, body),
  remove: (id) => shopProductControllerRemove(id),
  variants: (id, variants) => shopProductControllerVariants(id, { variants }),
  attributes: (id, attributeValues) => shopProductControllerAttributes(id, { attributeValues }),
  publish: (id) => shopProductControllerPublish(id),
  hide: (id) => shopProductControllerHide(id),
  uploadImage: (id, body) => shopProductImageControllerUpload(id, uploadFields(body)),
  updateImage: (id, imageId, body) => shopProductImageControllerUpdate(id, imageId, body),
  removeImage: (id, imageId) => shopProductImageControllerRemove(id, imageId),
  reorderImages: (id, imageIds) => shopProductImageControllerReorder(id, { imageIds }),
};

const endpointsOf = (scope: ProductScope): ProductEndpoints => (scope === "vendor" ? VENDOR : PLATFORM);

export interface ProductsQuery {
  keyword?: string;
  status?: string;
  category?: string;
  page: number;
  pageSize: number;
}

export function useProducts(scope: ProductScope, { keyword, status, category, page, pageSize }: ProductsQuery) {
  const params: ShopProductControllerListParams = {
    q: keyword || undefined,
    status: (status || undefined) as ShopProductControllerListStatus | undefined,
    category: category || undefined,
    sort: "newest",
    page,
    pageSize,
  };
  return useQuery({
    queryKey: scope === "vendor" ? getShopProductControllerListQueryKey(params) : getAdminProductControllerListQueryKey(params),
    queryFn: ({ signal }) =>
      scope === "vendor"
        ? shopProductControllerList(params, undefined, signal)
        : adminProductControllerList(params, undefined, signal),
    select: (res) => asPage<ProductListItem>(res),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useProduct(scope: ProductScope, id: string) {
  return useQuery({
    queryKey: scope === "vendor" ? getShopProductControllerGetQueryKey(id) : getAdminProductControllerGetQueryKey(id),
    queryFn: ({ signal }) =>
      scope === "vendor" ? shopProductControllerGet(id, undefined, signal) : adminProductControllerGet(id, undefined, signal),
    enabled: !!id,
    staleTime: 15_000,
  });
}

function useProductMutation<TVars, TRes>(
  scope: ProductScope,
  fn: (api: ProductEndpoints, vars: TVars) => Promise<TRes>,
  success: string | null,
  failure: string,
) {
  const qc = useQueryClient();
  const api = endpointsOf(scope);
  return useMutation({
    mutationFn: (vars: TVars) => fn(api, vars),
    onSettled: () => {
      void invalidateByPath(qc, api.basePath, api.inventoryPath, "/api/v1/products");
    },
    onSuccess: () => {
      if (success) toast.success(success);
    },
    onError: (e) => toast.error(apiErrorMessage(e, failure)),
  });
}

/* Tạo sản phẩm — luôn ở trạng thái NHÁP; thuộc tính bắt buộc của ngành chỉ chặn lúc đăng bán. */
export function useCreateProduct(scope: ProductScope) {
  return useProductMutation(
    scope,
    (api, body: CreateProductRequest) => api.create(body),
    "Đã tạo sản phẩm (trạng thái nháp).",
    "Tạo sản phẩm thất bại.",
  );
}

export interface SaveProductVars {
  patch: UpdateProductRequest;
  /**
   * Có mặt (ngành dynamic) → sau khi PATCH thông tin sẽ PUT thay TOÀN BỘ thuộc
   * tính cấp sản phẩm. Gửi sau PATCH vì đổi ngành sẽ dọn thuộc tính ngoài mẫu mới.
   */
  attributeValues?: AttributeValueInput[];
}

/* Lưu form thông tin: PATCH sản phẩm rồi (nếu có) PUT thuộc tính — hai endpoint riêng của backend. */
export function useSaveProduct(scope: ProductScope, id: string) {
  return useProductMutation(
    scope,
    async (api, { patch, attributeValues }: SaveProductVars) => {
      const updated = await api.update(id, patch);
      return attributeValues ? api.attributes(id, attributeValues) : updated;
    },
    "Đã lưu sản phẩm.",
    "Lưu sản phẩm thất bại.",
  );
}

export function useRemoveProduct(scope: ProductScope) {
  return useProductMutation(scope, (api, id: string) => api.remove(id), "Đã xoá sản phẩm.", "Xoá sản phẩm thất bại.");
}

/*
 * Thay TOÀN BỘ bộ biến thể (PUT) nhưng backend KHỚP theo tổ hợp (màu×size /
 * tổ hợp trục): biến thể trùng được cập nhật tại chỗ, GIỮ id + tồn kho; gỡ biến
 * thể đang giữ hàng / nằm trong phiếu nhập nháp → 409 PRODUCT_VARIANT_IN_USE.
 */
export function useSaveVariants(scope: ProductScope, id: string) {
  return useProductMutation(
    scope,
    (api, variants: VariantInput[]) => api.variants(id, variants),
    "Đã lưu biến thể.",
    "Lưu biến thể thất bại.",
  );
}

export function usePublishProduct(scope: ProductScope, id: string) {
  return useProductMutation(
    scope,
    (api) => api.publish(id),
    "Đã đăng bán sản phẩm.",
    "Đăng bán thất bại — sản phẩm cần có biến thể, ảnh và đủ thuộc tính bắt buộc.",
  );
}

export function useHideProduct(scope: ProductScope, id: string) {
  return useProductMutation(scope, (api) => api.hide(id), "Đã ẩn sản phẩm.", "Ẩn sản phẩm thất bại.");
}

export function useUploadProductImage(scope: ProductScope, id: string) {
  return useProductMutation(scope, (api, body: ProductImageUpload) => api.uploadImage(id, body), "Đã tải ảnh lên.", "Tải ảnh thất bại.");
}

export function useUpdateProductImage(scope: ProductScope, id: string) {
  return useProductMutation(
    scope,
    (api, { imageId, body }: { imageId: string; body: UpdateImageRequest }) => api.updateImage(id, imageId, body),
    null,
    "Cập nhật ảnh thất bại.",
  );
}

export function useRemoveProductImage(scope: ProductScope, id: string) {
  return useProductMutation(scope, (api, imageId: string) => api.removeImage(id, imageId), "Đã xoá ảnh.", "Xoá ảnh thất bại.");
}

/* Thứ tự mới của MỌI ảnh (không trùng); ảnh đầu tiên tự thành ảnh chính. */
export function useReorderProductImages(scope: ProductScope, id: string) {
  return useProductMutation(scope, (api, imageIds: string[]) => api.reorderImages(id, imageIds), null, "Đổi thứ tự ảnh thất bại.");
}
