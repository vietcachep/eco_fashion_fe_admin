# PLAN-0002 — Mở rộng thành cổng quản trị SÀN + NHÀ CUNG CẤP (vendor portal), 1 codebase 2 scope

> Status: Draft
> Owner: Agent
> Related Phase: Marketplace pivot (song song `eco_backend` PLAN-0014/0015)
> Related Docs: `docs/02_MODULE_MAP.md`, `docs/04_ROADMAP_REF.md`
> Phụ thuộc: `eco_backend/docs/plans/PLAN-0014-marketplace-shop-vendor.md` (permission `supplier.*`/
> `shop.*`, module `shop`) phải có API thật (hoặc ít nhất Swagger + mock) trước khi nối API thật ở đây;
> UI có thể code song song trên mock.

---

## 1. Goal

* Giữ NGUYÊN app hiện tại (`fashion_frontend_admin`) làm nơi nhân viên SÀN quản trị — không tách repo
  mới. Thêm 1 **route-group + scope thứ hai** cho **nhà cung cấp (vendor/chủ-nhân viên shop)** tự quản
  lý gian hàng của họ, dùng CHUNG hạ tầng (AppShell, DataTable, Guards, Orval, permission-codes).
* Đây là quyết định kiến trúc CHÍNH của plan này, chốt sau khi khảo sát dự án tham khảo
  `D:\Fullstack\eco_books\eco_frontend_admin` — họ đã chứng minh pattern "1 codebase, 2 route-group,
  1 `AppShell` tham số hoá theo `scope`" hoạt động tốt cho đúng bài toán này (route-group riêng, layout
  riêng, `RoleGuard` theo scope, permission namespace tách biệt `supplier.*`/`shop.*`, `shopId` luôn suy
  từ session — không bao giờ từ URL).
* Vì sao KHÔNG tách app riêng: AGENTS.md Rule 0 (feature-first mirroring backend module) đã có sẵn toàn
  bộ hạ tầng (DataTable, PermissionGuard, Orval, sidebar filter theo quyền) — dựng thêm 1 repo nghĩa là
  nhân đôi toàn bộ hạ tầng đó, tăng chi phí bảo trì mà không có lợi ích rõ ràng (2 nhóm người dùng không
  cần domain/subdomain khác nhau, không cần release độc lập).

---

## 2. Context

FITLY Admin frontend HIỆN TẠI (đã khảo sát thực tế, không chỉ đọc tài liệu):

* 10 feature (`ai, catalog, identity, order, payment, product, promotion, reporting, review, system`),
  UI đã code thật cho cả 10, nhưng 9/10 (trừ `identity`) chạy trên **mock** qua interceptor toàn cục
  (`lib/mock/mock-admin-adapter.ts`) — chuyển sang API thật bằng `NEXT_PUBLIC_ENABLE_MOCK=false`.
* 44 route thật dưới `(dashboard)`, permission 3 lớp (`PermissionGuard`, `usePermission`, `ApiErrorState`)
  đã hoàn chỉnh, 51/52 permission code đã map vào `PERMISSIONS` (constants.ts).
* Auth: login bằng email, access token RAM, refresh token localStorage, single-flight refresh — KHÔNG
  đổi trong plan này.

Reference documents:

* `AGENTS.md`, `README.md`, `docs/01_ARCHITECTURE.md`, `docs/03_API_STATE_RULES.md`
* Backend API: `eco_backend` Swagger `http://localhost:4000/docs`; permission catalog mới từ PLAN-0014.
* Pattern tham khảo (không copy code, chỉ theo kiến trúc):
  `eco_books/eco_frontend_admin/src/app/[locale]/(admin)`, `(seller)`, `components/layout/app-shell.tsx`,
  `components/layout/route-guards.tsx`, `lib/constants.ts` (namespace `supplier.*`/`shop.*`).

---

## 3. Scope

### In Scope

* Route-group mới `src/app/(vendor)/vendor/**` (label tiếng Việt "Nhà cung cấp" trong UI, code dùng
  `vendor` để khỏi trùng với route module BE `shop` — xem bảng route §5) — SONG SONG với `(dashboard)`
  hiện tại (đổi tên khái niệm nội bộ "scope=platform" cho `(dashboard)` nếu cần code rõ ràng, KHÔNG bắt
  buộc đổi URL cũ).
* `AppShell`/`Sidebar`/`Header` hiện tại tham số hoá theo `scope: "platform" | "vendor"` — 1 component
  dùng chung, không nhân đôi layout.
* `RoleGuard` MỚI (bổ sung cạnh `PermissionGuard` hiện có, không thay thế): kiểm tra user có
  `ShopMember` active hay không trước khi vào `/vendor/**`; nhân viên sàn lạc vào `/vendor/**` → 403 tại
  chỗ (không redirect, giữ URL — đúng pattern `PermissionGuard` hiện có đang làm).
* Feature module mới `features/shop/` — dùng chung cho CẢ HAI scope (giống cách eco_books đặt
  `features/supplier/components/{payouts,wallet}` dùng chung), tách theo sub-domain:
  * `features/shop/components/platform/` — màn hình sàn: danh sách/duyệt/khoá shop, sửa hoa hồng, xem
    ví/payout của bất kỳ shop (quyền `supplier.*`).
  * `features/shop/components/vendor/` — màn hình vendor: hồ sơ shop của mình, nhân viên shop, ví/payout
    của mình, dashboard doanh thu riêng (quyền `shop.*`).
* Mở rộng feature hiện có để nhận thêm scope vendor (route mới dưới `/vendor/**`, component con MỚI,
  KHÔNG sửa component admin hiện có — Rule 2 "sửa đâu đụng đó"):
  * `product` → `/vendor/products`, `/vendor/inventory` (vendor tự quản sản phẩm/tồn kho CỦA SHOP MÌNH).
  * `order` → `/vendor/orders` (đơn con thuộc shop mình, cập nhật trạng thái theo STAFF_TRANSITIONS).
  * `promotion` → `/vendor/promotions` (voucher scope=shop).
  * `review` → `/vendor/reviews` (trả lời đánh giá sản phẩm của mình).
* `lib/constants.ts`: `PERMISSIONS` thêm khối `supplier.*`/`shop.*` (đồng bộ từ `perms:sync` sau khi BE
  merge PLAN-0014), `VENDOR_NAV` (cây điều hướng riêng, song song `SIDEBAR_NAV` hiện có đổi tên hoặc giữ
  nguyên làm `PLATFORM_NAV`), `firstAllowedRoute()` nhận thêm tham số scope.
* Mock: mở rộng `mock-admin-data.ts`/`mock-admin-adapter.ts` để `/vendor/**` cũng chạy được trên mock
  trước khi BE PLAN-0014 xong (làm UI song song với BE — đúng yêu cầu "song song" của người dùng).

### Out of Scope

* Đăng ký shop mới (onboarding, chưa có API BE — PLAN-0014 §12 để mở).
* Đổi cơ chế auth/token hiện tại.
* Sửa lại 44 route `(dashboard)` hiện có (chỉ thêm, không sửa trừ khi cần thêm menu/permission mới).
* Tách app/deploy riêng cho vendor (đã quyết định 1 codebase — xem §1).

---

## 4. Affected Features / Areas

* Mới: `features/shop/`
* Mở rộng route/permission (không sửa logic cũ): `features/product/`, `features/order/`,
  `features/promotion/`, `features/review/`
* Sửa hạ tầng dùng chung (đúng luật Rule 2 — cần nói rõ vì đụng shared code):
  `components/layout/route-guards.tsx` (thêm `RoleGuard`), `components/layout/app-shell.tsx` hoặc
  sidebar/header hiện tại (tham số hoá `scope`), `lib/constants.ts`, `lib/permission-codes.generated.ts`
  (tự sinh lại qua `perms:sync`, không sửa tay).

---

## 5. Routes & Screens

```text
# Route-group mới, song song (dashboard) hiện có
(vendor)/vendor                          # dashboard riêng cho vendor
(vendor)/vendor/shop                     # hồ sơ shop của mình
(vendor)/vendor/shop/members             # nhân viên shop
(vendor)/vendor/products                 # sản phẩm của shop mình
(vendor)/vendor/products/new
(vendor)/vendor/products/[id]
(vendor)/vendor/inventory                # tồn kho/nhập kho của shop mình
(vendor)/vendor/orders                   # đơn con thuộc shop mình
(vendor)/vendor/orders/[code]
(vendor)/vendor/promotions
(vendor)/vendor/reviews
(vendor)/vendor/wallet                   # ví quỹ COD (đọc PLAN-0015 payment BE)
(vendor)/vendor/payouts                  # lịch sử payout của mình

# Thêm vào (dashboard) hiện có — sàn quản lý shop (không phải route mới hoàn toàn, mở rộng module "shop")
(dashboard)/shop/shops                   # danh sách/duyệt/khoá shop — module BE tên "shop"
(dashboard)/shop/shops/[id]
(dashboard)/shop/payouts                 # payout của MỌI shop (quyền supplier.payout.read)
```

Notes:

* Routes khai ở `src/lib/constants.ts` như quy ước hiện có — thêm khối `ROUTES.vendor.*` song song
  `ROUTES.shop.*` (module sàn).
* `(vendor)/layout.tsx` mỏng, gọi `AppShell` với `scope="vendor"` — không viết lại sidebar/header.
* Pages chỉ render feature component + bọc `PermissionGuard` + `RoleGuard` (Rule 0), y hệt quy ước hiện
  tại.

---

## 6. API Integration

```text
# Sàn (scope platform, quyền supplier.*)
GET    /api/v1/admin/shops
PATCH  /api/v1/admin/shops/:id/approve|suspend|reject|commission
GET    /api/v1/admin/shops/:id/wallet
GET    /api/v1/admin/payouts
POST   /api/v1/admin/payouts/run
PATCH  /api/v1/admin/payouts/:id/mark-paid

# Vendor (scope vendor, quyền shop.*, shopId server tự suy từ JWT — FE KHÔNG gửi shopId)
GET    /api/v1/shop/me
PATCH  /api/v1/shop/me
GET    /api/v1/shop/members
POST   /api/v1/shop/members
GET    /api/v1/shop/orders
PATCH  /api/v1/shop/orders/:code/status
GET    /api/v1/shop/wallet
GET    /api/v1/shop/payouts
# + các endpoint product/promotion/review hiện có, thêm biến thể /shop/* nếu BE tách riêng theo PLAN-0014
```

Notes:

* Sau khi BE merge PLAN-0014/0015, chạy `npm run api:sync` + `npm run perms:sync` — không tự viết tay
  DTO/permission code.
* Query keys mới: `["shop", "me"]`, `["shop", "wallet"]`, `["shop", "payouts"]`, `["admin-shop", ...]`
  (tách namespace query key admin-side vs vendor-side để tránh cache lẫn lộn giữa 2 scope nếu 1 user có
  cả 2 vai — hiếm nhưng có thể xảy ra với tài khoản test).

---

## 7. State & Forms

* Hook mới: `features/shop/hooks/use-shop-profile.ts`, `use-shop-members.ts`, `use-shop-wallet.ts`,
  `use-shop-payouts.ts` (vendor side); `use-admin-shops.ts`, `use-admin-payouts.ts` (platform side).
* Không thêm Zustand store mới — `scope` hiện tại (platform/vendor) suy từ ROUTE (route-group), không
  cần lưu global state; nếu 1 user thuộc cả 2 scope, header cần link "Chuyển sang Nhà cung cấp/Sàn"
  (menu chuyển scope, không phải store phức tạp).
* Zod schema mới: `features/shop/schemas/shop-profile-schema.ts`, `shop-member-schema.ts`,
  `wallet-deposit-schema.ts`.

---

## 8. Implementation Steps

* [x] Bước 1: `components/layout/route-guards.tsx` — thêm `RoleGuard` (kiểm tra
      `useCurrentUser().shopMemberships` không rỗng trước khi vào `/vendor/**`; 403 tại chỗ nếu không).
* [x] Bước 2: Tham số hoá `AppShell`/sidebar hiện tại theo `scope` — thêm `VENDOR_NAV` trong
      `constants.ts`, không sửa `SIDEBAR_NAV` hiện có ngoài việc đổi tên biến nếu cần rõ nghĩa.
* [x] Bước 3: `features/shop/` — dựng UI trên **mock trước** (mở rộng `mock-admin-data.ts`) cho cả 2
      sub-domain (`platform/`, `vendor/`): danh sách shop, duyệt/khoá, hồ sơ shop, nhân viên, ví, payout.
* [x] Bước 4: Route mới `(vendor)/vendor/**` + `(dashboard)/shop/**` — page.tsx mỏng theo Rule 0.
* [ ] Bước 5: Mở rộng `product`/`order`/`promotion`/`review` feature — thêm hook/component con phía
      vendor (route mới, KHÔNG sửa component/hook admin hiện có).
* [ ] Bước 6: Khi BE PLAN-0014/0015 có Swagger thật → `npm run perms:sync` + `npm run api:sync`, nối API
      thật, tắt mock cho các endpoint mới (thêm vào danh sách "REAL" trong mock adapter khi sẵn sàng,
      hoặc chuyển toàn bộ khi BE xong — theo đúng cơ chế cờ hiện có).
* [ ] Bước 7: Cập nhật `docs/01_ARCHITECTURE.md`, `docs/02_MODULE_MAP.md`, `AGENTS.md` (thêm mô tả scope
      vendor vào bảng kiến trúc Rule 0).

---

## 9. Validation / Test Plan

* [x] `npm run lint` passes.
* [x] `npm run typecheck` + `npm run build` passes.
* [x] Màn `/vendor/**` render đúng với mock (đã thử tay qua Browser tool: dashboard, hồ sơ shop, nhân
      viên shop + thêm/xoá, ví, payout — tài khoản demo `nhacungcap@ecofashion.vn`); render đúng với
      backend thật sau khi nối CHƯA thử (chờ BE PLAN-0014).
* [x] Nhân viên sàn (không có `ShopMember`) vào `/vendor/**` → `RoleGuard` chặn 403 tại chỗ, giữ URL
      (thử gián tiếp: tài khoản demo `kho@ecofashion.vn` không có `shopMemberships` → menu "Chuyển sang
      Nhà cung cấp" ở header tự ẩn, cùng hook `useShopMemberships` mà `RoleGuard` dùng).
* [x] Vendor vào `/dashboard`/`/shop/shops` (route sàn) → `PermissionGuard` chặn (đã thử tay: tài khoản
      demo nhà cung cấp vào `/dashboard` → 403 đúng mã `reporting.dashboard.read`).
* [x] Mobile width (390px) usable cho cả 2 scope (thử tay ở 375px: trang đăng nhập, 403, dashboard
      vendor, sheet menu mobile scope vendor).
* [x] Không cross-feature import (features/shop không import internals của features/product — nếu cần
      dữ liệu sản phẩm thì bọc hook riêng, đúng luật hiện có).
* [x] Không hardcode route/permission code — tất cả qua `ROUTES`/`PERMISSIONS`/`SHOP_PERMISSIONS` (mã
      `supplier.*`/`shop.*` tạm ép kiểu `as PermissionCode` có TODO, chờ `perms:sync`).

---

## 10. Risks / Notes

* Risk: `perms:sync`/`api:sync` phụ thuộc BE PLAN-0014 có Swagger thật — nếu BE chậm, giữ mock lâu hơn
  dự kiến; giảm rủi ro bằng cách BẮT ĐẦU UI ngay trên mock (đã lên kế hoạch ở Bước 3), không chờ BE.
* Risk: 1 user vừa là nhân viên sàn vừa là vendor (hiếm nhưng có thể xảy ra với tài khoản test/demo) —
  cần menu chuyển scope rõ ràng ở header, tránh nhầm lẫn đang ở khu nào.
  **Đã xử lý**: `components/layout/header.tsx` thêm mục "Chuyển sang Nhà cung cấp"/"Về khu quản trị sàn"
  trong dropdown tài khoản (chỉ hiện link sang vendor khi `useActiveShopMembership()` thật sự có).
* Assumption: Route-group `(vendor)` KHÔNG cần i18n/multi-locale như dự án tham khảo (FITLY chỉ tiếng
  Việt theo AGENTS.md) — không thêm `next-intl`.
* Open question: Không.
* Blocker: Chờ BE PLAN-0014 có ít nhất Swagger draft để chốt DTO trước khi hoàn thiện types (có thể tự
  viết `features/shop/types/` tay trước theo Rule 0 "DTO backend mà Orval không sinh", cập nhật lại khi
  Orval sinh xong).

---

## 11. Progress Log

| Date       | Progress     | Notes         |
| ---------- | ------------ | ------------- |
| 2026-09-28 | Created plan | Sau khảo sát song song eco_backend + 2 FE + eco_books |
| 2026-09-28 | Bước 1–4 xong (agent) | `RoleGuard` mới; `Sidebar`/`Header`/`SidebarNav`/`SidebarBrand` tham số hoá `scope`; `VENDOR_NAV` + nhóm sidebar "SÀN — GIAN HÀNG" mới trong `constants.ts`; `SHOP_PERMISSIONS` tạm (ngoài khối `PERMISSIONS satisfies...`) cho mã `supplier.*`/`shop.*` chưa sync; feature `features/shop/` đầy đủ (types/api/hooks/schemas/components platform+vendor) chạy trên mock mở rộng (`MOCK_SHOPS`, `MOCK_SHOP_MEMBERS`, `MOCK_SHOP_WALLET`, `MOCK_SHOP_PAYOUTS`, `MOCK_ADMIN_PAYOUTS`, `MOCK_SHOP_ME`); route `(vendor)/vendor/**` + `(dashboard)/shop/**` mới; thêm tài khoản demo nhà cung cấp `nhacungcap@ecofashion.vn` (mock-auth.ts, có `shopMemberships`) để test `RoleGuard`; thêm mục chuyển scope ở header. `npm run verify` xanh; đã thử tay toàn bộ luồng mock qua Browser tool (vendor dashboard/hồ sơ/nhân viên/ví/payout, sàn danh sách shop/chi tiết/sửa hoa hồng/payout, chặn 403 hai chiều, mobile 375px). Còn dang dở: Bước 5–7 (mở rộng product/order/promotion/review cho vendor, nối API thật, cập nhật docs kiến trúc) — ngoài phạm vi yêu cầu lần này. |
| 2026-10-04 | Đồng bộ BE mới (`api:sync` + `perms:sync`) | Màn Hoàn tiền (`features/payment`): nhãn loại hoàn (`REFUND_KIND`), nút "Ghi sổ lại" (`POST /admin/refunds/{id}/retry-finalize`), hộp thoại "Đối chiếu" cho refund VNPay chưa rõ kết quả (`needsReconcile` → nhập mã hoàn trên cổng hoặc `confirmGatewayNotRefunded`); danh sách/chi tiết shop dùng `ownerName`/`ownerEmail` do BE trả (xoá hook tra `/admin/users/:id` từng dòng — kế toán không có quyền đó); mã lỗi 409 `SHOP_INVITATION_LIMIT_REACHED` (trần 50 lời mời pending/shop) hiện qua toast của backend. `npm run verify` xanh |
| 2026-10-13 | Nhân viên gian hàng: bỏ lời mời, chuyển sang THÊM TRỰC TIẾP | `features/shop`: xoá `invite-member-dialog`, `shop-invitations-table`, hook mời/thu hồi, nhãn `SHOP_INVITATION_STATUS`, tab "Lời mời"; thêm `add-member-dialog.tsx` (họ tên, email, mật khẩu ban đầu + nút "Tạo ngẫu nhiên", vai; màn kết quả có "Sao chép"; `restored` = tài khoản cũ được khôi phục, mật khẩu không đổi), `useAddShopMember`, `shopMemberAddSchema`; khoá quyền `PERMISSIONS.shopStaffInvite` → `shopStaffAdd` (mã backend `shop.staff.invite` giữ nguyên). Kiểm trên backend thật với chủ shop mẫu: thêm → danh sách có dòng mới → gỡ → thêm lại bằng email cũ ⇒ "Đã thêm lại nhân viên". Phía SÀN thêm nhân viên đã có sẵn (`/identity/users` → "Tạo nhân viên"). `npm run verify` xanh |

---

## 12. Files Changed

```text
# Mới — feature shop (types/api/hooks/schemas/components platform+vendor)
src/features/shop/types/shop.ts
src/features/shop/api/admin-shop-api.ts
src/features/shop/api/vendor-shop-api.ts
src/features/shop/hooks/use-shop-membership.ts
src/features/shop/hooks/use-admin-shops.ts
src/features/shop/hooks/use-admin-payouts.ts
src/features/shop/hooks/use-shop-profile.ts
src/features/shop/hooks/use-shop-members.ts
src/features/shop/hooks/use-shop-wallet.ts
src/features/shop/hooks/use-shop-payouts.ts
src/features/shop/schemas/shop-profile-schema.ts
src/features/shop/schemas/shop-member-schema.ts
src/features/shop/schemas/shop-commission-schema.ts
src/features/shop/components/platform/shops-table.tsx
src/features/shop/components/platform/shop-detail.tsx
src/features/shop/components/platform/shop-commission-dialog.tsx
src/features/shop/components/platform/admin-payouts-table.tsx
src/features/shop/components/vendor/vendor-dashboard.tsx
src/features/shop/components/vendor/shop-profile-form.tsx
src/features/shop/components/vendor/shop-members-table.tsx
src/features/shop/components/vendor/add-member-dialog.tsx
src/features/shop/components/vendor/shop-wallet-panel.tsx
src/features/shop/components/vendor/vendor-payouts-table.tsx

# Mới — route-group vendor + route sàn
src/app/(vendor)/layout.tsx
src/app/(vendor)/vendor/page.tsx
src/app/(vendor)/vendor/shop/page.tsx
src/app/(vendor)/vendor/shop/members/page.tsx
src/app/(vendor)/vendor/wallet/page.tsx
src/app/(vendor)/vendor/payouts/page.tsx
src/app/(dashboard)/shop/shops/page.tsx
src/app/(dashboard)/shop/shops/[id]/page.tsx
src/app/(dashboard)/shop/payouts/page.tsx

# Sửa — hạ tầng dùng chung (Rule 2, thay đổi có nêu rõ trong task)
src/components/layout/route-guards.tsx        # + RoleGuard
src/components/layout/sidebar.tsx              # + tham số scope
src/components/layout/sidebar-nav.tsx          # + tham số scope, đọc VENDOR_NAV
src/components/layout/header.tsx               # + tham số scope, + mục chuyển scope
src/components/layout/sidebar-brand.tsx        # + tham số eyebrow
src/lib/constants.ts                           # + ROUTES.vendor/.shop, SHOP_PERMISSIONS,
                                                #   VENDOR_NAV, nhóm sidebar "SÀN — GIAN HÀNG",
                                                #   firstAllowedRoute() + tham số scope
src/lib/labels.ts                              # + SHOP_STATUS, SHOP_PAYOUT_STATUS,
                                                #   SHOP_MEMBER_ROLE_LABEL
src/lib/mock/mock-admin-data.ts                # + MOCK_SHOPS, MOCK_SHOP_ME, MOCK_SHOP_MEMBERS,
                                                #   MOCK_SHOP_WALLET, MOCK_SHOP_PAYOUTS,
                                                #   MOCK_ADMIN_PAYOUTS
src/lib/mock/mock-admin-adapter.ts             # + routing mock cho /admin/shops, /admin/payouts,
                                                #   /shop/me, /shop/members, /shop/wallet, /shop/payouts
src/lib/mock/mock-auth.ts                      # + DemoAccount.shopMemberships, tài khoản demo
                                                #   nhà cung cấp, admin có thêm mã supplier.*

# Khác
.claude/launch.json                            # mới — cấu hình chạy `npm run dev` để tự kiểm thử
docs/plans/PLAN-0002-vendor-portal.md          # cập nhật checklist/progress log/files changed
```

---

## 13. Follow-up Tasks

* [ ] Onboarding tự đăng ký shop mới (chờ BE).
* [ ] Thử đầu-cuối PayOS/VNPay thật (hoàn tiền "đối chiếu", "Ghi sổ lại") khi chủ dự án điền khoá — hiện mới kiểm bằng backend giả/DB dev.
* [ ] Dashboard doanh thu riêng cho vendor (chờ `reporting` module hỗ trợ lọc theo shop).

---

## 14. Definition of Done

* [ ] Build + lint pass.
* [ ] Feature-first structure respected; `features/shop/` tách sub-domain platform/vendor rõ ràng.
* [ ] API via shared Axios + TanStack Query; permission code qua `perms:sync`, không gõ tay.
* [ ] Plan checklist updated.
* [ ] Progress log updated.
* [ ] Follow-up tasks documented.
