"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminInventoryControllerAdjust,
  adminInventoryControllerCreateReceipt,
  adminInventoryControllerMovements,
  adminInventoryControllerPostReceipt,
  adminInventoryControllerReceipt,
  adminInventoryControllerReceipts,
  adminInventoryControllerStock,
  getAdminInventoryControllerMovementsQueryKey,
  getAdminInventoryControllerReceiptQueryKey,
  getAdminInventoryControllerReceiptsQueryKey,
  getAdminInventoryControllerStockQueryKey,
} from "@/lib/api/generated/admin-inventory/admin-inventory";
import {
  getShopInventoryControllerMovementsQueryKey,
  getShopInventoryControllerReceiptQueryKey,
  getShopInventoryControllerReceiptsQueryKey,
  getShopInventoryControllerStockQueryKey,
  shopInventoryControllerAdjust,
  shopInventoryControllerCreateReceipt,
  shopInventoryControllerMovements,
  shopInventoryControllerPostReceipt,
  shopInventoryControllerReceipt,
  shopInventoryControllerReceipts,
  shopInventoryControllerStock,
} from "@/lib/api/generated/shops/shops";
import type {
  AdjustStockRequest,
  CreateReceiptRequest,
  ShopInventoryControllerReceiptsStatus,
  StockMovementResponse,
  StockReceiptResponse,
  StockRowResponse,
} from "@/lib/api/generated/model";
import { invalidateByPath } from "@/lib/query-invalidate";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";
import { asPage } from "@/types/common";
import { inventoryErrorMessage, type InventoryScope } from "@/features/product/types/inventory";

/*
 * Tồn kho theo biến thể + phiếu nhập + điều chỉnh, dùng chung cho hai cổng:
 * "platform" (/admin/inventory, kho toàn sàn) và "vendor" (/shop/inventory, kho của
 * shop mình — shopId do backend suy từ ngữ cảnh shop, KHÔNG gửi trong body/query).
 *
 * Hai cổng cùng hình dạng request/response nên chỉ cần bảng nguồn dưới đây để chọn
 * hàm + khoá cache Orval; hook bên dưới là MỘT bản cho cả hai (không nhân bản). Khoá
 * cache dùng đúng hàm `get…QueryKey` do Orval sinh → `invalidateByPath` theo tiền tố
 * URL vẫn làm mới được.
 *
 * Ghi sổ phiếu (post) gửi header Idempotency-Key để bấm đúp / retry sau refresh 401
 * không nhập kho hai lần (backend ProductIdempotencyKey).
 */
interface StockQuery {
  q?: string;
  lowStockOnly?: boolean;
  page: number;
  size: number;
}

interface ReceiptsQuery {
  status?: ShopInventoryControllerReceiptsStatus;
  page: number;
  size: number;
}

interface InventorySource {
  /** Tiền tố URL của resource kho — dùng cho invalidate. */
  path: string;
  /** Resource liên quan phải làm mới khi tồn đổi (danh sách sản phẩm, báo cáo tồn thấp). */
  relatedPaths: string[];
  stockKey: (p: StockQuery) => readonly unknown[];
  stock: (p: StockQuery, signal?: AbortSignal) => Promise<unknown>;
  movementsKey: (variantId: string) => readonly unknown[];
  movements: (variantId: string, signal?: AbortSignal) => Promise<StockMovementResponse[]>;
  receiptsKey: (p: ReceiptsQuery) => readonly unknown[];
  receipts: (p: ReceiptsQuery, signal?: AbortSignal) => Promise<unknown>;
  receiptKey: (id: string) => readonly unknown[];
  receipt: (id: string, signal?: AbortSignal) => Promise<StockReceiptResponse>;
  createReceipt: (body: CreateReceiptRequest) => Promise<StockReceiptResponse>;
  postReceipt: (id: string, idempotencyKey: string) => Promise<StockReceiptResponse>;
  adjust: (body: AdjustStockRequest) => Promise<StockRowResponse>;
}

const SOURCES: Record<InventoryScope, InventorySource> = {
  platform: {
    path: "/api/v1/admin/inventory",
    relatedPaths: ["/api/v1/admin/products", "/api/v1/admin/reports"],
    stockKey: (p) => getAdminInventoryControllerStockQueryKey(p),
    stock: (p, signal) => adminInventoryControllerStock(p, undefined, signal),
    movementsKey: (id) => getAdminInventoryControllerMovementsQueryKey(id),
    movements: (id, signal) => adminInventoryControllerMovements(id, undefined, signal),
    receiptsKey: (p) => getAdminInventoryControllerReceiptsQueryKey(p),
    receipts: (p, signal) => adminInventoryControllerReceipts(p, undefined, signal),
    receiptKey: (id) => getAdminInventoryControllerReceiptQueryKey(id),
    receipt: (id, signal) => adminInventoryControllerReceipt(id, undefined, signal),
    createReceipt: (body) => adminInventoryControllerCreateReceipt(body),
    postReceipt: (id, key) => adminInventoryControllerPostReceipt(id, { headers: { "Idempotency-Key": key } }),
    adjust: (body) => adminInventoryControllerAdjust(body),
  },
  vendor: {
    path: "/api/v1/shop/inventory",
    relatedPaths: ["/api/v1/shop/products", "/api/v1/shop/reports"],
    stockKey: (p) => getShopInventoryControllerStockQueryKey(p),
    stock: (p, signal) => shopInventoryControllerStock(p, undefined, signal),
    movementsKey: (id) => getShopInventoryControllerMovementsQueryKey(id),
    movements: (id, signal) => shopInventoryControllerMovements(id, undefined, signal),
    receiptsKey: (p) => getShopInventoryControllerReceiptsQueryKey(p),
    receipts: (p, signal) => shopInventoryControllerReceipts(p, undefined, signal),
    receiptKey: (id) => getShopInventoryControllerReceiptQueryKey(id),
    receipt: (id, signal) => shopInventoryControllerReceipt(id, undefined, signal),
    createReceipt: (body) => shopInventoryControllerCreateReceipt(body),
    postReceipt: (id, key) => shopInventoryControllerPostReceipt(id, { headers: { "Idempotency-Key": key } }),
    adjust: (body) => shopInventoryControllerAdjust(body),
  },
};

/*
 * Bảng tồn theo biến thể. Backend tìm theo tên sản phẩm / SKU ở mức BIẾN THỂ và
 * phân trang + đếm + lọc `lowStockOnly` đều tính trên DB (không lọc bộ nhớ).
 * `enabled` cho dialog chọn biến thể: đóng thì không gọi API.
 */
export function useStock(
  scope: InventoryScope,
  params: { keyword?: string; lowStockOnly?: boolean; page: number; size: number },
  options: { enabled?: boolean } = {},
) {
  const src = SOURCES[scope];
  const query: StockQuery = {
    q: params.keyword || undefined,
    lowStockOnly: params.lowStockOnly || undefined,
    page: params.page,
    size: params.size,
  };
  return useQuery({
    queryKey: src.stockKey(query),
    queryFn: ({ signal }) => src.stock(query, signal),
    // Điểm ép kiểu DUY NHẤT: endpoint khai PageResponse không generic.
    select: (r) => asPage<StockRowResponse>(r),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    enabled: options.enabled ?? true,
  });
}

/* Sổ kho một biến thể (50 dòng gần nhất). */
export function useStockMovements(scope: InventoryScope, variantId: string) {
  const src = SOURCES[scope];
  return useQuery({
    queryKey: src.movementsKey(variantId),
    queryFn: ({ signal }) => src.movements(variantId, signal),
    enabled: !!variantId,
    staleTime: 15_000,
  });
}

export function useReceipts(scope: InventoryScope, params: { status?: string; page: number; size: number }) {
  const src = SOURCES[scope];
  const query: ReceiptsQuery = {
    status: (params.status || undefined) as ShopInventoryControllerReceiptsStatus | undefined,
    page: params.page,
    size: params.size,
  };
  return useQuery({
    queryKey: src.receiptsKey(query),
    queryFn: ({ signal }) => src.receipts(query, signal),
    select: (r) => asPage<StockReceiptResponse>(r),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useReceipt(scope: InventoryScope, id: string) {
  const src = SOURCES[scope];
  return useQuery({
    queryKey: src.receiptKey(id),
    queryFn: ({ signal }) => src.receipt(id, signal),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useCreateReceipt(scope: InventoryScope) {
  const qc = useQueryClient();
  const src = SOURCES[scope];
  return useMutation({
    mutationFn: (body: CreateReceiptRequest) => src.createReceipt(body),
    onSuccess: () => {
      invalidateByPath(qc, `${src.path}/receipts`);
      toast.success("Đã tạo phiếu nhập (nháp).");
    },
    onError: (e) => toast.error(inventoryErrorMessage(e, "Tạo phiếu nhập thất bại.")),
  });
}

/* Ghi sổ phiếu nhập → cộng tồn từng biến thể. Không hoàn tác được. */
export function usePostReceipt(scope: InventoryScope, id: string) {
  const qc = useQueryClient();
  const src = SOURCES[scope];
  const idem = useIdempotencyKey();
  return useMutation({
    mutationFn: () => src.postReceipt(id, idem.next()),
    onSuccess: () => {
      invalidateByPath(qc, src.path, ...src.relatedPaths);
      toast.success("Đã ghi sổ phiếu nhập — tồn kho đã cộng.");
    },
    onError: (e) => {
      // Lỗi thường do đồng nghiệp đã ghi sổ trước (phiếu không còn là nháp) → làm mới để thấy trạng thái thật.
      invalidateByPath(qc, `${src.path}/receipts`);
      toast.error(inventoryErrorMessage(e, "Ghi sổ thất bại."));
    },
    onSettled: () => idem.reset(),
  });
}

export function useAdjustStock(scope: InventoryScope) {
  const qc = useQueryClient();
  const src = SOURCES[scope];
  return useMutation({
    mutationFn: (body: AdjustStockRequest) => src.adjust(body),
    onSuccess: () => {
      invalidateByPath(qc, src.path, ...src.relatedPaths);
      toast.success("Đã điều chỉnh tồn kho.");
    },
    onError: (e) => toast.error(inventoryErrorMessage(e, "Điều chỉnh thất bại.")),
  });
}
