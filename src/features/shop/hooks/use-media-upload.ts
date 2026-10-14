"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { uploadControllerMedia } from "@/lib/api/generated/uploads/uploads";
import { apiErrorMessage } from "@/lib/api-error";
import type { UploadedMediaResponse } from "@/features/shop/types/upload";

/*
 * Tải ảnh lên (POST /uploads/media, JPG/PNG/WEBP ≤ 5MB) → URL dùng cho logo/banner gian hàng và ảnh chứng từ nộp quỹ.
 * Chỉ tải ảnh; việc gắn URL vào hồ sơ/yêu cầu do nơi gọi làm sau khi có URL.
 */
export function useUploadMedia() {
  return useMutation({
    mutationFn: async (file: File) => {
      // Orval khai response `void` (Swagger thiếu @ApiOkResponse) — điểm ép kiểu DUY NHẤT cho endpoint này.
      const res = await uploadControllerMedia({ file });
      return res as unknown as UploadedMediaResponse;
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Tải ảnh lên thất bại.")),
  });
}
