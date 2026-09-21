"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminCollectionControllerCreate,
  adminCollectionControllerImage,
  adminCollectionControllerRemove,
  adminCollectionControllerUpdate,
  useAdminCollectionControllerList,
} from "@/lib/api/generated/admin-catalog/admin-catalog";
import type { CreateCollectionRequest, UpdateCollectionRequest } from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";

/* Bộ sưu tập = bộ lọc đặt tên (ngành + giới + tag) hiện trên trang chủ. */
const PATH = "/api/v1/admin/collections";

export function useAdminCollections() {
  return useAdminCollectionControllerList({ query: { staleTime: 60_000 } });
}

function useCollectionMutation<TVars>(
  fn: (vars: TVars) => Promise<unknown>,
  success: string,
  failure: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      invalidateByPath(qc, PATH, "/api/v1/collections");
      toast.success(success);
    },
    onError: (e) => toast.error(apiErrorMessage(e, failure)),
  });
}

export function useCreateCollection() {
  return useCollectionMutation(
    (body: CreateCollectionRequest) => adminCollectionControllerCreate(body),
    "Đã tạo bộ sưu tập.",
    "Tạo bộ sưu tập thất bại.",
  );
}

export function useUpdateCollection() {
  return useCollectionMutation(
    ({ id, body }: { id: string; body: UpdateCollectionRequest }) => adminCollectionControllerUpdate(id, body),
    "Đã cập nhật bộ sưu tập.",
    "Cập nhật thất bại.",
  );
}

export function useRemoveCollection() {
  return useCollectionMutation(
    (id: string) => adminCollectionControllerRemove(id),
    "Đã xoá bộ sưu tập.",
    "Xoá thất bại.",
  );
}

export function useUploadCollectionImage() {
  return useCollectionMutation(
    ({ id, file }: { id: string; file: File }) => adminCollectionControllerImage(id, { file }),
    "Đã cập nhật ảnh bộ sưu tập.",
    "Tải ảnh thất bại.",
  );
}
