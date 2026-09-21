"use client";

import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/features/identity/api/auth-api";
import { getAuthControllerMeQueryKey } from "@/lib/api/generated/auth/auth";
import { useAuthStore } from "@/stores/auth-store";

/*
 * Hồ sơ người đang đăng nhập (GET /auth/me) — nguồn sự thật duy nhất về "ai
 * đang đăng nhập" và "được làm gì" (roleCode, permissionCodes, status). Là
 * SERVER data nên sống trong TanStack Query (State Rule), KHÔNG ở auth store.
 *
 * Gated theo access token: chưa có token (reload trước khi refresh xong) thì
 * query đứng yên thay vì bắn một 401 chắc chắn. App shell, route guard và
 * kiểm quyền đều đọc từ đây → đúng một bản cache.
 */
export const CURRENT_USER_QUERY_KEY = getAuthControllerMeQueryKey();

export function useCurrentUser() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: getCurrentUser,
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  });
}

/*
 * Kiểm quyền / vai cho guard và menu — suy từ MỘT bản hồ sơ đã cache nên phân
 * quyền không bao giờ lệch server. Mã quyền backend viết thường
 * (`order.order.read`).
 */
export function useHasPermission(code: string) {
  const { data } = useCurrentUser();
  return data?.permissionCodes?.includes(code) ?? false;
}

export function useHasRole(code: string) {
  const { data } = useCurrentUser();
  return data?.roleCode === code;
}
