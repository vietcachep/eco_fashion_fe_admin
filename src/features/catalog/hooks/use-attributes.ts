"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  attributeControllerDeleteValue,
  attributeControllerSaveValue,
  useAttributeControllerList,
} from "@/lib/api/generated/catalog/catalog";
import type { SaveAttributeValueRequest } from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";

/*
 * Bộ thuộc tính (màu / size / chất liệu) — backend chỉ có 3 bộ cố định, admin
 * thêm/sửa/xoá GIÁ TRỊ trong mỗi bộ. Danh sách lấy từ endpoint công khai
 * GET /attributes (không có bản admin riêng); ghi qua /admin/attributes/{code}/values.
 */
const PATH = "/api/v1/attributes";

export function useAttributes() {
  return useAttributeControllerList({ query: { staleTime: 5 * 60_000 } });
}

export function useSaveAttributeValue(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveAttributeValueRequest) => attributeControllerSaveValue(code, body),
    onSuccess: () => {
      invalidateByPath(qc, PATH);
      toast.success("Đã lưu giá trị thuộc tính.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Lưu giá trị thất bại.")),
  });
}

export function useDeleteAttributeValue(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (valueCode: string) => attributeControllerDeleteValue(code, valueCode),
    onSuccess: () => {
      invalidateByPath(qc, PATH);
      toast.success("Đã xoá giá trị.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Xoá thất bại — giá trị đang được biến thể dùng?")),
  });
}
