# PLAN-0001 — Khung FITLY Admin + Orval + toàn bộ màn quản trị

> Status: Done
> Owner: Agent (Claude) theo yêu cầu owner
> Related Docs: `AGENTS.md`, `docs/01_ARCHITECTURE.md`, `docs/02_MODULE_MAP.md`, backend `eco_backend/README.md`

---

## 1. Goal

Dựng web quản trị cho `eco_backend` (NestJS) theo format `ago_frontend`, nối API bằng Orval, đủ màn cho
11 module backend, chặn quyền 3 lớp theo catalog quyền backend.

## 2. Context

- Backend đã xong PLAN-0001…0013 (177 endpoint, 52 mã quyền, seed đầy đủ), chạy docker compose ở :4000.
- Chưa có repo admin; web bán hàng `fashion_frontend_user` đã có và cũng dùng Orval với backend này.

## 3. Scope

### In Scope
- Skeleton Next 16 + shadcn base-nova + TanStack + Zustand + RHF/Zod + Orval + scripts codegen quyền.
- Auth: login (email), refresh token body, silent bootstrap, logout, quên/đặt lại/đổi mật khẩu, hồ sơ + avatar.
- Shell: sidebar coral/than, header, guards, 403, skeleton.
- 40 màn quản trị (xem `docs/02_MODULE_MAP.md`).
- Tài liệu: AGENTS, README, PLANS, docs 01–02, CI.

### Out of Scope
- Dockerfile / CD (theo quy ước ago: chỉ khi go-live).
- Kéo-thả sắp ảnh (dùng nút trái/phải), editor Markdown WYSIWYG (textarea).
- Màn dành cho khách (giỏ, wishlist, thử đồ AI…).

## 4. Affected Features / Areas

Toàn bộ `src/` (repo mới).

## 5. Routes & Screens

Xem bảng trong `README.md` mục 5 và `docs/02_MODULE_MAP.md`.

## 6. API Integration

Toàn bộ qua Orval (`npm run api:sync`), trừ banner multipart (`features/system/api/banner-api.ts`).
Spec được chuẩn hoá nullable ở `scripts/fetch-openapi.mjs`; DTO thiếu schema viết tay ở `features/*/types`.

## 7. State & Forms

- `stores/auth-store.ts` (RT persist), `stores/sidebar-store.ts`.
- `hooks/use-list-state.ts` cho mọi màn danh sách; Zod schema mỗi feature (`schemas/`).

## 8. Implementation Steps

* [x] Khung dự án, copy ui shadcn từ ago, theme coral FITLY.
* [x] Orval config + fetch-openapi (chuẩn hoá) + perms sync/gen.
* [x] lib/api (proxy, refresh single-flight, rehydrate RT), mutator bóc envelope, api-error, labels, format.
* [x] Auth + shell + guards + 403.
* [x] reporting (dashboard, doanh thu, bán chạy, tồn kho).
* [x] identity (users, roles, quyền riêng, audit, login history).
* [x] catalog (categories tree + ảnh, collections, attributes).
* [x] product (list, form, variants matrix, images, publish/hide/delete, AI precheck) + inventory (stock, movements, adjust, receipts).
* [x] order (orders, status transitions, cancel, returns process).
* [x] payment (payments, confirm transfer, refunds, methods).
* [x] promotion (list, form, detail + usages).
* [x] review (moderate, reply + AI draft).
* [x] system (settings, provinces, banners, broadcast, contacts, faqs, pages).
* [x] ai (documents + index status, support, chat sessions + insights, moderation flags, insights + ask, tools, usage).
* [x] Tài liệu + CI.

## 9. Validation / Test Plan

* [x] `npm run lint` — 0 lỗi (11 cảnh báo React Compiler bỏ qua react-hook-form, chấp nhận).
* [x] `npm run typecheck`, `npm run build` — 47 route.
* [x] Đăng nhập admin thật, đi qua toàn bộ 40 màn với dữ liệu seed: không màn lỗi.
* [x] Ghi thật: tạo + xoá FAQ qua UI (POST 201 / DELETE 200, danh sách refetch).
* [x] Reload trang: bootstrap refresh 200 → me 200 → dữ liệu (phiên sống qua F5).
* [x] Vai `warehouse`: sidebar còn 4 nhóm, Dashboard hiện 403 kèm mã `reporting.dashboard.read`; sau đăng nhập được đưa tới màn đầu tiên có quyền.
* [x] Mobile: sidebar thành Sheet, bảng cuộn ngang.

## 10. Risks / Notes

- Backend chú thích Swagger chưa đủ (envelope, PageResponse generic, nullable thiếu type, ~50 endpoint thiếu
  schema) → FE vá ở 3 chỗ (docs/01). Đề xuất backend bổ sung `type: String` + `@ApiOkResponse` để giảm DTO tay.
- Sửa `stores/auth-store.ts` / `lib/api.ts` khi đang đăng nhập ở dev có thể làm HMR giữ hai bản store → refresh
  bằng token cũ → backend thu hồi phiên (đúng thiết kế). Đăng nhập lại là xong.
- `ProductVariantResponse` admin không có `isActive` → editor biến thể gửi `isActive: true` cho mọi dòng.

## 11. Progress Log

| Date | Progress | Notes |
|---|---|---|
| 2026-09-15 | Tạo plan + dựng toàn bộ | Build xanh, kiểm thử thật trên backend compose |

## 12. Files Changed

Repo mới — toàn bộ `src/`, `scripts/`, `openapi/`, `docs/`, config.

## 13. Follow-up Tasks

* [ ] Backend: `@ApiPropertyOptional({ nullable: true, type: String })` + `@ApiOkResponse` cho endpoint thiếu → chạy lại `api:sync`, xoá DTO tay tương ứng.
* [ ] Kéo-thả sắp ảnh sản phẩm; upload nhiều ảnh song song có tiến trình.
* [ ] Trang tĩnh: xem trước Markdown.
* [ ] Dockerfile + CD khi go-live (cùng backend).

## 14. Definition of Done

* [x] Build + lint pass.
* [x] Feature-first structure respected.
* [x] API via shared Axios + TanStack Query (Orval).
* [x] Plan checklist updated.
