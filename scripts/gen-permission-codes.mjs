/*
 * Bước "gen" của luồng codegen quyền — sinh union type từ catalog backend.
 *
 * Đọc `openapi/permissions.json` → sinh `src/lib/permission-codes.generated.ts`
 * chứa mảng `PERMISSION_CODES` + type `PermissionCode`.
 *
 * Mục đích: mã quyền là CHUỖI, TypeScript không kiểm được chuỗi tự do. Gõ
 * "product.products.read" (thừa chữ s) vẫn biên dịch, chỉ âm thầm chặn sai. Có
 * union type thì `PERMISSIONS` (lib/constants.ts) khai bằng
 * `satisfies Record<string, PermissionCode>` → gõ sai là ĐỎ ngay, backend đổi/xoá
 * mã thì chạy lại script là thấy đúng chỗ vỡ.
 *
 * Mã `deprecated` vẫn sinh (backend không xoá mã đã phát hành) nhưng đừng dùng.
 * KHÔNG sửa tay file sinh ra. Chạy `npm run perms:sync`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "openapi/permissions.json");
const OUT = join(root, "src/lib/permission-codes.generated.ts");

const list = JSON.parse(readFileSync(SRC, "utf8"));
if (!Array.isArray(list)) {
  console.error("✗ openapi/permissions.json không phải mảng");
  process.exit(1);
}
const codes = [...new Set(list.map((p) => p.code).filter(Boolean))].sort();
if (codes.length === 0) {
  console.error("✗ Catalog rỗng — dừng để không xoá trắng type đang dùng.");
  process.exit(1);
}

const body = `/**
 * ⚠ FILE SINH TỰ ĐỘNG — KHÔNG SỬA TAY.
 * Nguồn: openapi/permissions.json (catalog quyền của backend eco_backend).
 * Sinh lại: npm run perms:sync
 *
 * ${codes.length} mã quyền dạng module.resource.action. Dùng để ràng buộc kiểu
 * cho PERMISSIONS trong lib/constants.ts và props của PermissionGuard / PermissionGate.
 */

export const PERMISSION_CODES = [
${codes.map((c) => `  ${JSON.stringify(c)},`).join("\n")}
] as const;

/** Mọi mã quyền hợp lệ theo catalog backend. */
export type PermissionCode = (typeof PERMISSION_CODES)[number];
`;

writeFileSync(OUT, body, "utf8");
console.log(
  `✓ src/lib/permission-codes.generated.ts — ${codes.length} mã quyền`,
);
