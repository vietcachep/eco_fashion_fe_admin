"use client";

import { useHasPermission } from "@/features/identity/hooks/use-current-user";
import type { PermissionCode } from "@/lib/permission-codes.generated";

/*
 * Hỏi quyền của người đang đăng nhập — hook dùng chung toàn app.
 *
 * Vì sao tồn tại: nguồn quyền nằm trong `features/identity` (đọc từ hồ sơ /me),
 * nhưng MỌI module đều cần hỏi quyền. Feature không được import internals của
 * feature khác (Rule 0), nên chỗ dùng chung phải là hook toàn cục ở đây —
 * đúng chỗ README đã dành sẵn cho "hook dùng chung đầu tiên".
 *
 * Khi nào dùng hook này thay vì `<PermissionGate>`:
 *   - Cần giá trị boolean để ghép điều kiện, hoặc để QUYẾT ĐỊNH CÓ TRUYỀN PROP
 *     hành động xuống component con hay không (vd `reference-screen` chỉ trao
 *     `onDelete` khi có quyền xoá).
 *   - Còn chỉ ẩn/hiện một mẩu JSX thì dùng `<PermissionGate>` cho gọn.
 *
 * Bỏ trống mã = luôn cho phép — dùng cho tài nguyên catalog backend chưa có mã
 * (giống quy ước lọc sidebar: không khai mã thì không khoá).
 */
export function usePermission(code?: PermissionCode): boolean {
  const has = useHasPermission(code ?? "");
  return !code || has;
}
