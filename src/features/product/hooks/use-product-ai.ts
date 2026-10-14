"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminAiControllerPrecheck } from "@/lib/api/generated/admin-ai/admin-ai";
import { apiErrorMessage } from "@/lib/api-error";
import type { PrecheckResponse } from "@/types/ai-staff-tools";

/*
 * Trợ lý AI trong màn sản phẩm (quyền ai.copy.create, chỉ cổng sàn): kiểm listing
 * trước khi đăng bán. Đồng bộ, không ghi DB; AI lỗi thì backend trả kết quả theo
 * rule (source = "rule"). Gợi ý ngành/giới/tag (classify) nằm ở màn Công cụ AI.
 */
export function usePrecheckProduct() {
  return useMutation({
    mutationFn: async (productId: string) =>
      (await adminAiControllerPrecheck(productId)) as unknown as PrecheckResponse,
    onError: (e) => toast.error(apiErrorMessage(e, "Không kiểm được listing.")),
  });
}
