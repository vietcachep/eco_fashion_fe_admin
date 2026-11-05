"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { uploadControllerMedia } from "@/lib/api/generated/uploads/uploads";
import type { MediaItemInput } from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";

/*
 * Tải MỘT ảnh minh chứng (POST /uploads/media, JPG/PNG/WEBP ≤ 5MB) và trả về đúng hình dạng `MediaItemInput` để gắn vào
 * body từ chối / xác nhận nhận hàng. Backend chỉ nhận URL do endpoint này trả về (ORDER_RETURN_EVIDENCE_INVALID nếu URL lạ),
 * nên không có ô dán URL tay. Video chưa được hỗ trợ.
 */
export function useUploadReturnEvidence() {
  return useMutation({
    mutationFn: async (file: File): Promise<MediaItemInput> => {
      // Orval khai response `void` (Swagger thiếu @ApiOkResponse) — điểm ép kiểu DUY NHẤT cho endpoint này.
      const res = (await uploadControllerMedia({ file })) as unknown as { url: string; name?: string };
      return { type: "image", url: res.url, name: res.name || file.name };
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Tải ảnh minh chứng thất bại.")),
  });
}
