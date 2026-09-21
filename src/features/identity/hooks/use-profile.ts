"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateAvatar, updateProfile } from "@/features/identity/api/auth-api";
import { CURRENT_USER_QUERY_KEY } from "@/features/identity/hooks/use-current-user";
import { apiErrorMessage } from "@/lib/api-error";
import type { ProfileInput } from "@/features/identity/schemas/profile-schema";

/*
 * Sửa hồ sơ của tôi (họ tên / SĐT / ảnh đại diện). Hồ sơ hiển thị lấy từ
 * useCurrentUser (/auth/me) nên sau khi lưu chỉ cần invalidate key đó.
 */
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProfileInput) => updateProfile(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
      toast.success("Đã cập nhật hồ sơ.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Cập nhật hồ sơ thất bại.")),
  });
}

export function useUpdateAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => updateAvatar(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
      toast.success("Đã đổi ảnh đại diện.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Đổi ảnh đại diện thất bại.")),
  });
}
