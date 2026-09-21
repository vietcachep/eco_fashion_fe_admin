/*
 * Bước "spec" của luồng codegen API — tải OpenAPI JSON từ backend NestJS đang
 * chạy về `openapi/api-docs.json` và COMMIT file đó (CI không có backend).
 *
 * URL lấy từ env API_SPEC_URL, mặc định http://localhost:4000/docs/openapi.json
 * (backend bật EF_SWAGGER_ENABLED=true).
 *
 * CHUẨN HOÁ TRƯỚC KHI GHI (vá lỗ hổng chú thích Swagger của backend, KHÔNG đổi
 * hợp đồng runtime): DTO backend khai `@ApiPropertyOptional({ nullable: true })`
 * mà không kèm `type`, nên @nestjs/swagger phát ra `{ type: 'object', nullable:
 * true }` cho ~100 trường vốn là `string | null` (phone, avatarUrl, imageUrl…)
 * → Orval sinh `{ [key: string]: unknown }` thay vì `string`. Ở đây: property
 * `object` nullable KHÔNG có properties/additionalProperties → coi là `string`,
 * trừ bảng ngoại lệ bên dưới (đối chiếu tay với mã nguồn backend). Backend bổ
 * sung `type: String` vào decorator thì bước này thành no-op.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const url =
  process.env.API_SPEC_URL || "http://localhost:4000/docs/openapi.json";
const out = join(root, "openapi/api-docs.json");

/* Trường nullable KHÔNG phải chuỗi — schema thật theo backend. */
const OVERRIDES = {
  "PromotionForm.usageLimit": { type: "integer", nullable: true },
  "PromotionForm.usageLimitPerUser": { type: "integer", nullable: true },
  "CreatePromotionRequest.usageLimit": { type: "integer", nullable: true },
  "CreatePromotionRequest.usageLimitPerUser": { type: "integer", nullable: true },
  // true = cấp, false = chặn, null = gỡ override (về theo vai)
  "UserPermissionOverrideItem.allowed": { type: "boolean", nullable: true },
  "OrderResponse.promotion": {
    type: "object",
    nullable: true,
    properties: {
      code: { type: "string" },
      name: { type: "string", nullable: true },
    },
    required: ["code"],
  },
};

function isTypelessNullableObject(p) {
  return (
    p &&
    typeof p === "object" &&
    p.type === "object" &&
    p.nullable === true &&
    !p.properties &&
    !p.additionalProperties &&
    !p.$ref &&
    !p.allOf &&
    !p.oneOf
  );
}

function normalize(spec) {
  let patched = 0;
  for (const [name, schema] of Object.entries(spec.components?.schemas ?? {})) {
    for (const [prop, def] of Object.entries(schema.properties ?? {})) {
      const key = `${name}.${prop}`;
      if (OVERRIDES[key]) {
        schema.properties[prop] = { ...def, ...OVERRIDES[key] };
        patched += 1;
      } else if (isTypelessNullableObject(def)) {
        schema.properties[prop] = { ...def, type: "string" };
        patched += 1;
      }
    }
  }
  return patched;
}

const res = await fetch(url, { headers: { "Cache-Control": "no-cache" } });
if (!res.ok) {
  console.error(
    `✗ Không tải được spec (${res.status}) từ ${url} — backend có đang chạy không?`,
  );
  process.exit(1);
}
const spec = await res.json();
const patched = normalize(spec);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(spec, null, 2) + "\n", "utf8");
console.log(
  `✓ openapi/api-docs.json — ${Object.keys(spec.paths ?? {}).length} path, chuẩn hoá ${patched} trường nullable`,
);
