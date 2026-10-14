"use client";

import { useSystemPublicControllerPublicSettings } from "@/lib/api/generated/system/system";

/*
 * Hotline / email hỗ trợ của sàn (GET /settings/public — công khai). Dùng ở màn nộp quỹ: backend CHƯA có setting
 * "tài khoản nhận quỹ của sàn" nên vendor được hướng dẫn liên hệ để nhận thông tin chuyển khoản.
 * Setting trả `Record<string, unknown>` nhưng Orval khai `void` → ép kiểu một chỗ, đọc từng khoá có kiểm tra chuỗi.
 */
export interface PlatformContact {
  hotline?: string;
  email?: string;
}

export function usePlatformContact() {
  return useSystemPublicControllerPublicSettings({
    query: {
      select: (r): PlatformContact => {
        const s = (r ?? {}) as unknown as Record<string, unknown>;
        return {
          hotline: typeof s["shop.hotline"] === "string" ? s["shop.hotline"] : undefined,
          email: typeof s["shop.email"] === "string" ? s["shop.email"] : undefined,
        };
      },
      staleTime: 10 * 60_000,
    },
  });
}
