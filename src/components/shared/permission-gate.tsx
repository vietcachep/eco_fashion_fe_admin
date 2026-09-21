"use client";

import { useHasPermission } from "@/features/identity/hooks/use-current-user";
import type { PermissionCode } from "@/lib/permission-codes.generated";

/*
 * Ẩn một mẩu giao diện khi người dùng thiếu quyền — dùng cho NÚT hành động
 * (Thêm / Sửa / Xóa / Duyệt), khác `PermissionGuard` vốn chặn cả màn.
 *
 * Khác biệt cốt lõi: guard thì HIỆN màn 403 để giải thích; gate thì ẨN LẶNG LẼ.
 * Người không được tạo chi nhánh không cần biết là có nút "Tạo chi nhánh" tồn
 * tại — hiện ra rồi báo lỗi khi bấm chỉ làm họ mất công.
 *
 * Đây là lớp trải nghiệm, KHÔNG phải bảo mật: backend vẫn là nơi chặn thật.
 * Ẩn nút chỉ để người dùng khỏi đâm vào việc chắc chắn thất bại.
 */
export function PermissionGate({
  permission,
  fallback = null,
  children,
}: {
  /**
   * Mã quyền theo catalog backend, vd "ORGANIZATION.BRANCH.CREATE".
   * Kiểu `PermissionCode` sinh từ catalog → gõ sai là TypeScript báo đỏ.
   * Bỏ trống = luôn hiện — dùng cho resource catalog backend chưa có mã
   * (giống quy ước lọc sidebar: không khai mã thì không khoá).
   */
  permission?: PermissionCode;
  /** Hiện gì khi thiếu quyền (mặc định: không hiện gì). */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const has = useHasPermission(permission ?? "");
  const allowed = !permission || has;
  return <>{allowed ? children : fallback}</>;
}
