"use client";

import { ForbiddenScreen } from "@/components/shared/forbidden-screen";
import {
  apiErrorMessage,
  forbiddenPermissionCode,
  isForbiddenError,
} from "@/lib/api-error";

/*
 * Hiển thị lỗi tải dữ liệu của một màn, thống nhất toàn app.
 *
 * Vì sao tách riêng 403: `PermissionGuard` chỉ chặn được màn nào frontend biết
 * trước mã quyền. Còn những trường hợp nó KHÔNG thể biết — màn chưa có mã
 * quyền trong catalog, admin gỡ quyền lúc nhân viên đang mở màn, hoặc phạm vi
 * dữ liệu (có quyền sửa nhưng không phải bản ghi đó) — thì chỉ backend mới
 * biết. Lúc đó API trả 403 và màn này đổi sang giao diện 403 tử tế, thay vì
 * để lại một bảng rỗng kèm dòng chữ đỏ khó hiểu.
 *
 * Lỗi khác 403 (mạng, 500, 404) vẫn hiện gọn trong khung cảnh báo để không
 * phá bố cục màn.
 */
export function ApiErrorState({
  error,
  fallback,
  compact = false,
}: {
  error: unknown;
  /** Câu hiển thị khi backend không gửi message nào. */
  fallback: string;
  /** true = luôn hiện dạng khung gọn, kể cả 403 (dùng trong panel/tab nhỏ). */
  compact?: boolean;
}) {
  if (!compact && isForbiddenError(error)) {
    return <ForbiddenScreen permissionCode={forbiddenPermissionCode(error)} />;
  }

  return (
    <div
      role="alert"
      className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
    >
      {apiErrorMessage(error, fallback)}
    </div>
  );
}
