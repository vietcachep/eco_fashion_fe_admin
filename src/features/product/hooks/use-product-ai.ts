"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminAiControllerClassify,
  adminAiControllerPrecheck,
} from "@/lib/api/generated/admin-ai/admin-ai";
import type { ClassifyRequest } from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import type { ClassifyProductResponse, PrecheckResponse } from "@/types/ai-staff-tools";

/*
 * Trợ lý AI trong màn sản phẩm (quyền ai.copy.create): kiểm listing trước khi
 * đăng bán và gợi ý ngành/giới/tag từ tên + mô tả. Đồng bộ, không ghi DB; AI
 * lỗi thì backend trả kết quả theo rule (source = "rule").
 */
export function usePrecheckProduct() {
  return useMutation({
    mutationFn: async (productId: string) =>
      (await adminAiControllerPrecheck(productId)) as unknown as PrecheckResponse,
    onError: (e) => toast.error(apiErrorMessage(e, "Không kiểm được listing.")),
  });
}

export function useClassifyProduct() {
  return useMutation({
    mutationFn: async (body: ClassifyRequest) =>
      (await adminAiControllerClassify(body)) as unknown as ClassifyProductResponse,
    onError: (e) => toast.error(apiErrorMessage(e, "Không gợi ý được phân loại.")),
  });
}
