# 01 — Kiến trúc FITLY Admin

## Tổng thể

```text
Trình duyệt ──/api/*──▶ Next.js Route Handler (app/api/[...path]) ──▶ eco_backend NestJS :4000
                        (proxy same-origin, bỏ Origin — không cần CORS)   /api/v1/... + Swagger /docs
```

Toàn bộ màn nằm sau `AuthGuard` (route group `(dashboard)`); trang công khai chỉ có login / quên mật khẩu.
Đây là app CLIENT-side sau đăng nhập: page.tsx là Server Component mỏng chỉ render component feature;
dữ liệu tải ở client qua TanStack Query.

## Luồng dữ liệu (một chiều)

```text
page.tsx ─▶ features/<m>/components ─▶ features/<m>/hooks ─▶ lib/api/generated (Orval) ─▶ lib/api/mutator ─▶ lib/api.ts (axios)
                                                    └──▶ features/<m>/api (chỉ khi Swagger tả thiếu)
```

- **Orval** sinh hàm + hook cho 177 endpoint từ `openapi/api-docs.json` (mode `tags-split`: một thư mục
  mỗi tag `admin-users`, `admin-products`…). Component KHÔNG import code sinh; hook feature bọc lại để đặt
  `select`, `staleTime`, `placeholderData` và ép kiểu.
- **Mutator** bóc envelope `ApiResponse` → `data`. Lỗi giữ nguyên axios error; `lib/api-error.ts` đọc
  `message`, `error.code`, `error.details.required`, `requestId`.
- **Refresh token**: `lib/api.ts` interceptor 401 → `refreshSession()` single-flight → gọi lại request.
  RT persist localStorage (`stores/auth-store.ts`, `skipHydration`); `useSessionBootstrap` rehydrate + refresh
  lúc app tải; trước mỗi refresh đọc lại RT mới nhất (2 tab).

## Vì sao FE phải "vá" spec Swagger

Backend khai `@ApiOkResponse({ type: Dto })` với DTO trần (không bọc envelope) và `PageResponse` không
generic; ~50 endpoint (system, promotion, payment, review, reporting, ai) không khai schema response; ~110
trường `nullable: true` thiếu `type` nên phát ra `object`. FE xử lý ở đúng ba chỗ:

1. `scripts/fetch-openapi.mjs` — chuẩn hoá nullable trước khi Orval sinh (bảng ngoại lệ ghi rõ).
2. `lib/api/mutator.ts` — bóc envelope để kiểu sinh khớp runtime.
3. `features/<m>/types/` + `asPage<T>()` — DTO viết tay chép từ backend cho endpoint thiếu schema.

Backend bổ sung `type: String` / `@ApiOkResponse` đầy đủ thì (1) và (3) teo dần, không phải sửa màn.

## Phân quyền

Mã quyền `module.resource.action` từ `eco_backend/src/modules/identity/permission/catalog.ts` →
`scripts/sync-permissions.mjs` → `openapi/permissions.json` → `src/lib/permission-codes.generated.ts`
(union type). `lib/constants.ts PERMISSIONS` + `SIDEBAR_NAV` ràng kiểu. Ba lớp: `PermissionGuard` (màn),
`PermissionGate`/`usePermission` (nút), `ApiErrorState` (403 từ API).

## Shell

`components/layout/`: `sidebar.tsx` (desktop, thu gọn được, sticky) + `sidebar-nav.tsx` (menu từ
`SIDEBAR_NAV`, lọc quyền 2 cấp, mục active = href dài nhất khớp) + `header.tsx` (mobile Sheet, menu tài
khoản) + `route-guards.tsx` (AuthGuard / GuestGuard / PermissionGuard kèm Suspense cho useSearchParams).

## Danh sách chuẩn

`hooks/use-list-state.ts` giữ trang / từ khoá (debounce) / bộ lọc và đồng bộ lên URL → dashboard link
thẳng `?status=pending`. `components/shared/data-table.tsx` chế độ server (pageIndex 0-based, backend 1-based).
