import { create } from "zustand";
import { persist } from "zustand/middleware";

/*
 * Phiên đăng nhập — client state toàn app (AGENTS.md State Rule).
 *
 * Backend NestJS eco_backend trả CẢ HAI token trong body (`TokenPairResponse`),
 * không dùng cookie httpOnly như ago_backend. Vì vậy:
 * - accessToken: sống ngắn (15 phút), giữ TRONG BỘ NHỚ — không persist. Reload
 *   là mất; SessionProvider tự làm mới bằng refreshToken.
 * - refreshToken: persist vào localStorage để phiên sống qua reload. Đánh đổi đã
 *   biết: XSS đọc được localStorage; backend bù bằng rotation (mỗi lần refresh
 *   thu hồi token cũ, phát token mới) + blacklist khi logout/đổi mật khẩu.
 * - bootstrapped: app đã thử khôi phục phiên lần đầu chưa. Trước khi = true,
 *   route guard KHÔNG được kết luận "chưa đăng nhập" — sẽ nháy màn login oan.
 *
 * `skipHydration: true` + rehydrate() thủ công trong SessionProvider: tránh
 * lệch HTML server/client (server không có localStorage).
 *
 * Hồ sơ người dùng (tên, vai, mã quyền) là SERVER data → sống trong TanStack
 * Query qua useCurrentUser(), KHÔNG ở đây. Component không đọc token trực tiếp;
 * chỉ axios interceptor (lib/api.ts) và hook của feature identity đụng store này.
 */
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  bootstrapped: boolean;
  setTokens: (access: string, refresh: string) => void;
  setBootstrapped: (bootstrapped: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      bootstrapped: false,
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
      setBootstrapped: (bootstrapped) => set({ bootstrapped }),
      clear: () => set({ accessToken: null, refreshToken: null }),
    }),
    {
      name: "fitly-admin-auth",
      partialize: (s) => ({ refreshToken: s.refreshToken }),
      skipHydration: true,
    },
  ),
);
