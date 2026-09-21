import axios, { type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/auth-store";
import { ROUTES } from "@/lib/constants";
import { shouldMockEndpoint, mockAdapter } from "@/lib/mock/mock-admin-adapter";

/*
 * Axios instance DUY NHẤT của app (AGENTS.md API Rule). Mọi lời gọi HTTP — kể
 * cả code Orval sinh ra qua `lib/api/mutator.ts` — đều đi qua đây.
 *
 * - baseURL: trống mặc định → gọi same-origin /api/* và Route Handler
 *   `app/api/[...path]/route.ts` chuyển tiếp sang backend (không CORS). Đặt
 *   NEXT_PUBLIC_API_URL để trình duyệt gọi thẳng backend.
 * - Request: gắn access token từ auth store.
 * - Response 401: làm mới phiên MỘT lần (single-flight) bằng refresh token rồi
 *   gọi lại đúng request đó. Làm mới thất bại → xoá phiên, đưa về /login.
 *
 * Component KHÔNG import file này — đi qua hook trong features/<module>/hooks.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

/*
 * Serialize query params: bỏ undefined/null/"" (backend NestJS ValidationPipe
 * `transform` sẽ coi chuỗi rỗng là giá trị thật và báo 400 với @IsIn/@IsEnum),
 * lặp lại mảng (`?ids=a&ids=b`).
 */
function serializeParams(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  const append = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) value.forEach((v) => append(key, v));
    else sp.append(key, String(value));
  };
  Object.entries(params).forEach(([k, v]) => append(k, v));
  return sp.toString();
}

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 20_000,
  headers: { "Content-Type": "application/json" },
  paramsSerializer: serializeParams,
});

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  // Upload multipart: để axios tự đặt boundary, đừng ép application/json.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  // Chế độ Mock cho các màn hình ngoài luồng đăng nhập & phân quyền
  if (shouldMockEndpoint(config.url)) {
    config.adapter = mockAdapter;
  }

  return config;
});

/*
 * Các endpoint auth LÀ luồng xác thực — 401 từ chúng không được kích hoạt
 * refresh-and-retry (đệ quy, hoặc che mất lỗi "sai mật khẩu" thật).
 */
const AUTH_PATHS = ["/auth/login", "/auth/refresh", "/auth/logout"];
function isAuthEndpoint(url?: string): boolean {
  return !!url && AUTH_PATHS.some((path) => url.includes(path));
}

/*
 * Single-flight refresh: nhiều request cùng 401 một lúc chỉ được phép bay MỘT
 * lời gọi refresh. Backend xoay refresh token mỗi lần — gửi song song hai lần
 * cùng token cũ là lần thứ hai bị coi là dùng lại và cả phiên bị thu hồi.
 * Dùng `axios` trần (không phải `api`) để không tái nhập interceptor bên dưới.
 */
let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  /*
   * Đọc lại refresh token MỚI NHẤT từ localStorage trước khi gọi: mở hai tab,
   * tab A vừa xoay token thì bản trong RAM của tab B đã cũ — gửi bản cũ là
   * backend coi như dùng lại token và thu hồi cả họ (đăng xuất cả hai tab).
   */
  await useAuthStore.persist.rehydrate();
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    const res = await axios.post(
      `${API_BASE}/api/v1/auth/refresh`,
      { refreshToken },
      {
        /*
         * BẮT BUỘC: axios trần KHÔNG thừa hưởng timeout của `api`. Thiếu nó, một
         * lần refresh treo là bootstrap không bao giờ settle → AuthGuard đứng ở
         * loader vĩnh viễn. Hết giờ thì coi như hết phiên.
         */
        timeout: 15_000,
        headers: { "Content-Type": "application/json" },
      },
    );
    const pair = res.data?.data as
      | { accessToken?: string; refreshToken?: string }
      | undefined;
    if (!pair?.accessToken || !pair.refreshToken) return null;
    useAuthStore.getState().setTokens(pair.accessToken, pair.refreshToken);
    return pair.accessToken;
  } catch {
    return null;
  }
}

export function refreshSession(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as RetriableConfig | undefined;

    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isAuthEndpoint(original.url) &&
      typeof window !== "undefined"
    ) {
      original._retry = true;

      const newToken = await refreshSession();
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original); // gọi lại đúng request đó, trong suốt với caller
      }

      // Refresh thất bại → phiên thật sự hết.
      useAuthStore.getState().clear();
      useAuthStore.getState().setBootstrapped(true);
      if (!window.location.pathname.startsWith(ROUTES.login)) {
        window.location.href = ROUTES.login;
      }
    }

    return Promise.reject(error);
  },
);
