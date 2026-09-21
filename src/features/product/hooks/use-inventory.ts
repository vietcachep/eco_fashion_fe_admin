"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminInventoryControllerAdjust,
  adminInventoryControllerCreateReceipt,
  adminInventoryControllerPostReceipt,
  useAdminInventoryControllerMovements,
  useAdminInventoryControllerReceipt,
  useAdminInventoryControllerReceipts,
  useAdminInventoryControllerStock,
} from "@/lib/api/generated/admin-inventory/admin-inventory";
import type {
  AdjustStockRequest,
  CreateReceiptRequest,
  StockReceiptResponse,
  StockRowResponse,
} from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";
import { asPage } from "@/types/common";

/*
 * Tồn kho theo biến thể + phiếu nhập + điều chỉnh. Ghi sổ kho (post phiếu)
 * gửi header Idempotency-Key để bấm đúp / retry sau refresh 401 không nhập
 * kho hai lần (backend ProductIdempotencyKey).
 */
const PATH = "/api/v1/admin/inventory";
const PRODUCTS_PATH = "/api/v1/admin/products";

export function useStock(params: { keyword?: string; lowStockOnly?: boolean; page: number; size: number }) {
  return useAdminInventoryControllerStock(
    {
      q: params.keyword || undefined,
      lowStockOnly: params.lowStockOnly || undefined,
      page: params.page,
      size: params.size,
    },
    {
      query: {
        select: (r) => asPage<StockRowResponse>(r),
        placeholderData: keepPreviousData,
        staleTime: 15_000,
      },
    },
  );
}

export function useStockMovements(variantId: string) {
  return useAdminInventoryControllerMovements(variantId, { query: { enabled: !!variantId, staleTime: 15_000 } });
}

export function useReceipts(params: { status?: string; page: number; size: number }) {
  return useAdminInventoryControllerReceipts(
    { status: (params.status || undefined) as never, page: params.page, size: params.size },
    {
      query: {
        select: (r) => asPage<StockReceiptResponse>(r),
        placeholderData: keepPreviousData,
        staleTime: 15_000,
      },
    },
  );
}

export function useReceipt(id: string) {
  return useAdminInventoryControllerReceipt(id, { query: { enabled: !!id, staleTime: 15_000 } });
}

export function useCreateReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateReceiptRequest) => adminInventoryControllerCreateReceipt(body),
    onSuccess: () => {
      invalidateByPath(qc, `${PATH}/receipts`);
      toast.success("Đã tạo phiếu nhập (nháp).");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Tạo phiếu nhập thất bại.")),
  });
}

/* Ghi sổ phiếu nhập → cộng tồn từng biến thể. Không hoàn tác được. */
export function usePostReceipt(id: string) {
  const qc = useQueryClient();
  const idem = useIdempotencyKey();
  return useMutation({
    mutationFn: () =>
      adminInventoryControllerPostReceipt(id, { headers: { "Idempotency-Key": idem.next() } }),
    onSuccess: () => {
      invalidateByPath(qc, PATH, PRODUCTS_PATH);
      toast.success("Đã ghi sổ phiếu nhập — tồn kho đã cộng.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Ghi sổ thất bại.")),
    onSettled: () => idem.reset(),
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdjustStockRequest) => adminInventoryControllerAdjust(body),
    onSuccess: () => {
      invalidateByPath(qc, PATH, PRODUCTS_PATH);
      toast.success("Đã điều chỉnh tồn kho.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Điều chỉnh thất bại.")),
  });
}
