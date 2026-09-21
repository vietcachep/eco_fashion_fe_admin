<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — Luật code FITLY Admin (fashion_frontend_admin)

## Project Context

Đây là **web quản trị** của cửa hàng thời trang **FITLY** (EcoFashion) — MỘT cửa hàng, KHÔNG phải sàn.
Backend ở repo riêng `D:\Fullstack\eco_fashion\eco_backend` (NestJS 12 + Prisma 7, modular monolith,
11 module: identity · catalog · product · cart · order · payment · promotion · review · system ·
reporting · ai). Đọc `eco_backend/AGENTS.md` và `docs/06_FE_CONTRACT.md` của backend trước khi đụng tới
API. Web bán hàng cho khách là repo `fashion_frontend_user` (không nằm đây).

Người dùng của app này là **nhân viên nhiều vai** (admin · quản lý · bán hàng & CSKH · kho · kế toán ·
marketing). Mỗi vai một bộ quyền; quyền cấp/chặn riêng theo từng người. Chỉ tiếng Việt, tiền VND.

Bám sát format của `D:\project_ago_fruit\ago_erp\ago_frontend` (Rule 0–4, feature-first, Orval,
3 lớp chặn quyền, plan). Khác biệt do backend NestJS — cố ý, không "sửa cho giống ago":

| Khác biệt | Hệ quả trong code |
|---|---|
| Đăng nhập bằng `email`; refresh token trả trong BODY (không cookie httpOnly) | `stores/auth-store.ts` persist refresh token ở localStorage, access token chỉ trong RAM; `lib/api.ts` refresh single-flight + đọc lại RT mới nhất trước khi gọi |
| Mọi body bọc `ApiResponse{success,message,data,error,requestId}` nhưng Swagger khai DTO trần | `lib/api/mutator.ts` bóc `data` — kiểu Orval sinh khớp dữ liệu hook nhận |
| `PageResponse` không generic; nhiều endpoint không khai schema response | `types/common.ts asPage<T>()`; DTO viết tay trong `features/<m>/types/` chép từ backend |
| Backend chú thích `nullable: true` thiếu `type` (~110 trường) | `scripts/fetch-openapi.mjs` chuẩn hoá spec trước khi Orval sinh (xem comment trong script) |
| Mã quyền chữ thường `module.resource.action`; 403 trả `error.details.required` | `lib/api-error.ts forbiddenPermissionCode` đọc `details.required` |
| Trang bắt đầu từ 1 (`page`/`size`; riêng sản phẩm `page`/`pageSize`) | `hooks/use-list-state.ts` giữ pageIndex 0-based cho DataTable, gửi `page = pageIndex + 1` |

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript strict
- Tailwind CSS 4 + shadcn/ui (style `base-nova`, @base-ui/react)
- TanStack Query (server state) + Axios (HTTP) + **Orval** (codegen từ OpenAPI)
- Zustand (client state) · React Hook Form + Zod (form) · TanStack Table (bảng) · recharts (biểu đồ)

Không thêm thư viện cho việc stack đã giải quyết được.

## Rule 0 — Always Follow the Code Framework (bất khả xâm phạm)

Mọi thay đổi — tính năng, sửa lỗi, chỉnh giao diện, code sinh — PHẢI nằm đúng chỗ trong khung dưới.
Không có ngoại lệ "sửa nhanh"; code "tạm" là code vĩnh viễn.

| Bạn muốn thêm... | Đặt vào |
|---|---|
| Màn hình / route mới | `app/(dashboard)/<module>/<resource>/page.tsx` — chỉ render component từ features, bọc `PermissionGuard` |
| Component nghiệp vụ | `features/<module>/components/<sub-domain>/` — gom theo nghiệp vụ con |
| Gọi API backend (đã có trong Swagger) | KHÔNG viết tay — `npm run api:sync` để Orval sinh, rồi bọc trong `features/<module>/hooks/` |
| Gọi API Swagger tả thiếu (multipart có `file` mà body JSON…) | `features/<module>/api/` qua `lib/api.ts` (vd `system/api/banner-api.ts`) |
| Form + validation | Zod ở `features/<module>/schemas/` + RHF trong component |
| DTO backend mà Orval không sinh | `features/<module>/types/` (chép từ backend, ghi nguồn file) |
| Kiểu dùng ≥2 feature | `src/types/` (vd `ai-staff-tools.ts`) |
| State toàn app | `src/stores/` (auth, sidebar) |
| Component dùng chung ≥2 feature | `components/shared/` |
| Component shadcn mới | `npx shadcn add ...` → `components/ui/` (không sửa tay) |
| Route path / mã quyền / menu / vai | `lib/constants.ts` |
| Nhãn tiếng Việt + tông màu cho mã trạng thái backend | `lib/labels.ts` |
| Util thuần (tiền, ngày) | `lib/format.ts` |

- **Reuse before write.** Bảng = `components/shared/data-table.tsx`; tab lọc = `filter-tabs.tsx`; số liệu =
  `stat-card.tsx`; nhãn–giá trị = `detail-list.tsx`; chọn ảnh = `file-picker.tsx`; select = `native-select.tsx`;
  lỗi API = `api-error-state.tsx`; xác nhận = `confirm-dialog.tsx`. Bảng/form/badge trùng là bug.
- Đổi khung (thư mục top-level mới, pattern mới) = cập nhật `AGENTS.md` + `docs/01_ARCHITECTURE.md` + plan
  trong cùng thay đổi.

## Rule 1 — Tốc độ trước, đẹp sau

- Danh sách LUÔN phân trang server (`page/size`), không fetch-all-rồi-lọc; `keepPreviousData` khi sang trang.
- Skeleton khớp layout cho mọi màn dữ liệu; không màn trắng, không spinner trơ.
- Biểu đồ (recharts) tải lười qua `next/dynamic`; icon import lẻ từ lucide.
- `staleTime` theo bản chất dữ liệu: danh mục/vai 60s–10 phút; đơn/thanh toán 10–15s; insight AI (backend cache
  1–6h) 10 phút. Không polling trừ dashboard (2 phút) và trạng thái chỉ mục AI (1 phút).
- `invalidateByPath(qc, "/api/v1/admin/...")` (lib/query-invalidate.ts) làm mới theo tiền tố URL của Orval
  key — không tự đặt key tay cho endpoint sinh tự động.

## Rule 2 — Sửa đâu, đụng đó

Sửa màn X chỉ chạm `features/<x>/**`, `app/(dashboard)/<x>/**` và plan. Code dùng chung
(`components/shared`, `components/ui`, `lib/`, `stores/`, `types/`, `globals.css`, config) ảnh hưởng mọi
màn → chỉ đổi khi yêu cầu nói rõ, hoặc dừng lại báo.

## Rule 3 — Đổi giao diện, giữ nguyên kiến trúc

Yêu cầu "làm đẹp" chỉ được chạm JSX / Tailwind / token trong `globals.css`. KHÔNG chạm `lib/api*`,
`features/*/hooks`, `features/*/api`, query key, Zod shape, store, routing. Luồng một chiều
`component → hook → api (Orval/axios)`; UI không biết axios.

## Rule 4 — Dọn sạch rồi mới code

Dựng lại giao diện trên code có sẵn: XÓA HẲN phần không còn dùng trước (component, type, mock, route,
mục menu), rồi viết mới, rồi quét lại — không còn export/file mồ côi, `lint` + `build` xanh.

## Architecture Rule: Feature-first (tên = module backend)

```text
src/
├── app/            # routing + layout ONLY; (auth) công khai, (dashboard) có shell + AuthGuard
├── features/       # identity · catalog · product · order · payment · promotion · review · system · reporting · ai
├── components/     # ui/ (shadcn) · layout/ (sidebar, header, guards) · shared/
├── lib/            # api.ts, api/mutator.ts, api/generated/ (Orval), constants, labels, format, api-error, query-client, permission-codes.generated.ts
├── stores/         # auth-store, sidebar-store
├── hooks/          # use-permission, use-list-state, use-idempotency-key
├── providers/      # app-providers, session-provider
└── types/          # common (ApiResponse, PageResponse, Money, asPage), ai-staff-tools
```

Trong feature: `api/` (chỉ khi Orval không tả được) · `components/<sub-domain>/` · `hooks/` · `schemas/` ·
`types/`. Feature KHÔNG import internals của feature khác; cần dữ liệu module khác thì bọc endpoint đó
bằng hook riêng trong feature mình (vd `system/hooks/use-recipient-search.ts` bọc `/admin/users`).

Route = `/<module>/<resource>` khớp tên module backend: `/product/products`, `/product/inventory/stock`,
`/order/orders/[code]`, `/payment/refunds`, `/system/banners`, `/reporting/revenue`, `/ai/documents`…

## API Rule (Orval)

- `npm run api:sync` = `api:spec` (tải `/docs/openapi.json` từ backend đang chạy → `openapi/api-docs.json`,
  chuẩn hoá nullable) + `api:gen` (Orval → `src/lib/api/generated/`). Commit cả spec lẫn code sinh.
- `src/lib/api/generated/**` là build artifact — KHÔNG sửa tay (eslint-ignored, `clean: true`).
- Component KHÔNG import hook sinh trực tiếp; mỗi feature bọc trong `hooks/` (query option, `select`, ép kiểu
  `asPage<T>` / `as unknown as T` cho endpoint thiếu schema — điểm ép kiểu DUY NHẤT).
- Import **type** từ `@/lib/api/generated/model` được phép ở mọi nơi.
- Tên hàm sinh dạng `<Controller><Method>` (`adminUserControllerList`, `useAdminProductControllerGet`).
  Orval sinh hook `useXxx` cho cả POST (cấu hình `useQuery: true`) — mutation thì gọi hàm thường + `useMutation`.
- Mọi HTTP qua `src/lib/api.ts` (kể cả code sinh, qua mutator). `Idempotency-Key` cho ghi sổ nhập kho
  (`hooks/use-idempotency-key.ts`). Base path `/api/v1`; proxy same-origin ở `app/api/[...path]/route.ts`;
  `NEXT_PUBLIC_API_URL` để gọi thẳng.
- Backend đổi API → chạy lại `api:sync`; đổi catalog quyền → `perms:sync`. Cả hai commit file sinh.

## State Rule

- Server data = TanStack Query. Không chép vào Zustand. Hồ sơ /me sống ở `useCurrentUser()`.
- Client state = Zustand (`stores/`): token (auth-store), thu gọn sidebar.
- Bộ lọc/tìm kiếm danh sách = `hooks/use-list-state.ts` (đồng bộ URL `?status=&q=` để dashboard link thẳng).
- Form = RHF + Zod; số nhập bằng `register(name, { valueAsNumber: true })` + `z.number()` (không `z.coerce`).
- Dialog cần state theo bản ghi: tách body thành component con có `key={item.id}` — KHÔNG `setState` trong
  `useEffect` để reset (React Compiler lint `set-state-in-effect`).

## Permission Rule (3 lớp)

| Lớp | Khi nào | Công cụ |
|---|---|---|
| 1 — vào màn | thiếu quyền đọc → 403 tại chỗ, giữ URL + sidebar | `PermissionGuard` (`components/layout/route-guards.tsx`) |
| 2 — trong màn | thiếu quyền ghi → ẩn nút | `PermissionGate` / `usePermission` |
| 3 — API 403 | backend từ chối → `ApiErrorState` đổi sang màn 403 kèm mã | `lib/api-error.ts` |

- Mã quyền lấy từ catalog backend qua `npm run perms:sync` → `openapi/permissions.json` →
  `src/lib/permission-codes.generated.ts` (type `PermissionCode`). `PERMISSIONS` trong `lib/constants.ts`
  khai `satisfies Record<string, PermissionCode>` — gõ sai là đỏ.
- Sidebar lọc quyền cả hai cấp; cha tự ẩn khi con hết. `firstAllowedRoute()` đưa người vừa đăng nhập tới
  màn đầu tiên họ có quyền.
- Vai `customer` bị chặn ngay ở `features/identity/api/auth-api.ts login()` — khu quản trị chỉ cho nhân viên.
- Chặn ở frontend là trải nghiệm, KHÔNG phải bảo mật — backend `PermissionGuard` mới enforce thật.
- Hook bọc query mà tự nặn object trả về BẮT BUỘC trả `error`; màn dùng `ApiErrorState` phải có
  `isForbiddenError` (trừ panel con dùng `compact`).

## Naming / Coding

- File/thư mục kebab-case; component PascalCase; hook `useXxx`; store `useXxxStore`.
- Comment code, log, commit tiếng Việt; định danh kỹ thuật tiếng Anh. Block comment cho shell/provider/
  interceptor/store giải thích VÌ SAO (không lặp lại tên).
- Không `any`; endpoint thiếu schema ép kiểu đúng một chỗ trong hook.
- Ảnh động (Cloudinary / `/static/seed`) dùng `<img>` kèm `eslint-disable-next-line @next/next/no-img-element`.
- Mobile-first: màn nào cũng dùng được ở 390px (sidebar thành Sheet).

## Git Workflow Rule

Owner điều khiển git: không tự `commit`/`push`/tạo nhánh. Xong việc → `npm run verify` → báo "ready".

## Planning Rule

Việc lớn (module mới, đổi shell/auth/API layer, màn báo cáo, xuyên feature) → tạo/cập nhật plan trong
`docs/plans/PLAN-XXXX-*.md` theo `docs/plans/PLANS_TEMPLATE.md` TRƯỚC khi code; tick checklist khi làm.

## Done Definition

- `npm run verify` (lint + typecheck + build) xanh.
- Rule 0–4 tôn trọng; không import chéo feature; không hardcode URL/route/mã quyền.
- API qua Orval + axios chung; danh sách phân trang server; skeleton khớp layout; 3 lớp quyền đủ.
- Đã thử trên backend thật (docker compose `eco_backend`) với ít nhất một vai không phải admin.
