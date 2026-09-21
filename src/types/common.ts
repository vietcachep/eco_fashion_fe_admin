/*
 * Hợp đồng API toàn cục — điểm khớp duy nhất giữa frontend và backend
 * (eco_backend `src/common/response/api-response.ts`). Đổi bên kia phải đổi đây.
 */

export interface ApiError {
  code: string;
  path: string;
  details: Record<string, string>;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  error: ApiError | null;
  requestId: string;
  timestamp: string;
}

/*
 * Trang dữ liệu chuẩn. `page` bắt đầu từ 1 (khác ago: 0). Orval sinh
 * `PageResponse` KHÔNG có generic (Swagger không tả được) — hook của feature
 * ép kiểu về `PageResponse<T>` này qua `asPage<T>()`.
 */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/* Tiền VND từ backend: chuỗi số nguyên + chuỗi hiển thị sẵn. */
export interface Money {
  amount: string;
  display: string;
  currency: string;
  symbol: string;
}

/*
 * Ép kiểu trang không generic (Orval) → trang có kiểu. Đây là điểm ép kiểu
 * DUY NHẤT cho danh sách; item type phải khớp DTO backend (features/<m>/types).
 */
export function asPage<T>(res: unknown): PageResponse<T> {
  return res as PageResponse<T>;
}

/* Trang rỗng để màn render khung khi chưa có dữ liệu. */
export const EMPTY_PAGE: PageResponse<never> = {
  content: [],
  page: 1,
  size: 0,
  totalElements: 0,
  totalPages: 1,
  first: true,
  last: true,
};
