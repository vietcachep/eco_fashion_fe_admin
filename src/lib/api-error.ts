import { isAxiosError } from "axios";

/*
 * Đọc lỗi API ở MỘT chỗ duy nhất — mọi màn nói cùng một giọng.
 *
 * Backend NestJS trả envelope ApiResponse khi lỗi:
 *   { success:false, message, error:{ code, path, details }, requestId }
 * - `message`: câu tiếng Việt hiện được cho người dùng.
 * - `error.code`: mã ổn định `<MODULE>_<LY_DO>` (IDENTITY_INVALID_CREDENTIALS…)
 *   để UI rẽ nhánh mà không so chuỗi thông báo.
 * - 403 COMMON_FORBIDDEN kèm `details.required` = mã quyền còn thiếu (phẩy).
 * - `requestId`: mã tra log — hiện trong màn lỗi để người dùng báo lại.
 */

interface ErrorBody {
  message?: string;
  requestId?: string;
  error?: { code?: string; details?: Record<string, string> };
}

function errorBody(err: unknown): ErrorBody | undefined {
  return isAxiosError(err) ? (err.response?.data as ErrorBody | undefined) : undefined;
}

export function apiStatus(err: unknown): number | undefined {
  return isAxiosError(err) ? err.response?.status : undefined;
}

/* Thiếu quyền — backend là nguồn sự thật cuối cùng về phân quyền. */
export function isForbiddenError(err: unknown): boolean {
  return apiStatus(err) === 403;
}

/* Câu báo lỗi backend gửi kèm, nếu có. */
export function apiMessage(err: unknown): string | undefined {
  const body = errorBody(err);
  if (body?.message) return body.message;
  if (isAxiosError(err) && err.code === "ERR_NETWORK")
    return "Không kết nối được máy chủ.";
  return undefined;
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  return apiMessage(err) ?? fallback;
}

/* Mã lỗi ổn định của backend (error.code). */
export function apiErrorCode(err: unknown): string | undefined {
  return errorBody(err)?.error?.code;
}

/* requestId để người dùng báo lại khi gặp lỗi lạ. */
export function apiRequestId(err: unknown): string | undefined {
  return errorBody(err)?.requestId;
}

/*
 * Mã quyền còn thiếu khi 403 — backend gửi sẵn ở `error.details.required`
 * ("product.product.read,product.inventory.read"). Lấy mã đầu tiên để màn 403
 * hiện đúng mã nhân viên cần báo cho admin.
 */
export function forbiddenPermissionCode(err: unknown): string | undefined {
  if (!isForbiddenError(err)) return undefined;
  const required = errorBody(err)?.error?.details?.required;
  return required?.split(",")[0]?.trim() || undefined;
}
