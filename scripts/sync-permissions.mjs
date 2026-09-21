/*
 * Bước "spec" của luồng codegen quyền — soi gương `api:spec` của Orval.
 *
 * Đọc CATALOG QUYỀN từ repo backend (`src/modules/identity/permission/catalog.ts`,
 * nguồn sự thật của mọi mã `module.resource.action`) → ghi `openapi/permissions.json`
 * và COMMIT file đó. Lý do chép thay vì đọc thẳng repo backend lúc build: CI chỉ
 * checkout repo frontend — hệt như lý do `openapi/api-docs.json` được commit.
 *
 * catalog.ts là TypeScript nên không require được từ Node thuần; parse bằng regex
 * theo đúng khuôn backend dùng: `p('module', 'resource.action', 'mô tả')` và
 * `{ ...p(...), deprecated: true }`. Backend đổi khuôn thì script này phải đổi theo.
 *
 * Đường dẫn repo backend lấy từ env BACKEND_REPO, mặc định `../eco_backend`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backendRepo =
  process.env.BACKEND_REPO || join(root, "..", "eco_backend");
const CATALOG = join(
  backendRepo,
  "src/modules/identity/permission/catalog.ts",
);
const OUT = join(root, "openapi/permissions.json");

if (!existsSync(CATALOG)) {
  console.error(`✗ Không thấy catalog quyền tại:\n  ${CATALOG}`);
  console.error(
    "\nĐặt biến môi trường BACKEND_REPO trỏ tới repo backend, ví dụ:\n" +
      '  BACKEND_REPO="D:/Fullstack/eco_fashion/eco_backend" npm run perms:spec',
  );
  process.exit(1);
}

const src = readFileSync(CATALOG, "utf8");
// Chỉ lấy phần mảng PERMISSION_CATALOG, tránh vớ nhầm `codes(...)` trong preset vai.
const start = src.indexOf("PERMISSION_CATALOG");
const end = src.indexOf("];", start);
const block = src.slice(start, end);

const re =
  /p\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']*)'\s*\)(\s*,\s*deprecated:\s*true)?/g;
const list = [];
for (const m of block.matchAll(re)) {
  list.push({
    code: `${m[1]}.${m[2]}`,
    module: m[1],
    description: m[3],
    deprecated: !!m[4],
  });
}

if (list.length === 0) {
  console.error("✗ Không parse được mã quyền nào — backend đổi khuôn catalog.ts?");
  process.exit(1);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(list, null, 2) + "\n", "utf8");
console.log(
  `✓ openapi/permissions.json — ${list.length} quyền (${list.filter((p) => p.deprecated).length} deprecated)`,
);
