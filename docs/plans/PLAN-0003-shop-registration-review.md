# PLAN-0003 — Duyệt hồ sơ đăng ký gian hàng

> Status: Done (2026-10-15) — đã thử với backend thật (xem PLAN-0019 §10). Client Orval cho 3 route mới đã được chép vào `src/lib/api/generated` (tag riêng `shop-registrations`/`admin-shop-registrations`, không chạy `api:sync` — lần `api:sync` đầy đủ sau này tự sinh lại y hệt).
> Owner: Agent
> Plan gốc (hợp đồng API, quy tắc song song): `eco_backend/docs/plans/PLAN-0019-shop-self-registration.md`.

## 1. Mục tiêu

Nhân viên sàn quyết định duyệt/từ chối một gian hàng do người bán tự đăng ký có đủ thông tin: người đại diện, SĐT, ngành hàng, mô tả, người nộp (tên + email), ngày nộp; sau khi quyết định thấy lý do từ chối. Duyệt = người nộp thành chủ shop (backend làm trong cùng transaction).

## 2. Phạm vi

* Hook `useAdminShopRegistration(shopId)` trong `features/shop/hooks/use-admin-shops.ts`-lân cận (file mới `use-admin-shop-registration.ts`), bọc hàm Orval `adminShopRegistrationControllerGet` (đúng tên sau khi sinh).
* Component mới `features/shop/components/platform/shop-registration-card.tsx` — thẻ "Hồ sơ đăng ký" (DetailList), hiện trong chi tiết gian hàng (chèn ngắn vào `shop-detail.tsx`/`shop-profile-tab.tsx`); shop không có hồ sơ (seed) ⇒ ẩn thẻ.
* Hộp thoại duyệt/từ chối: nhắc "người đăng ký sẽ trở thành chủ shop" khi duyệt; hiện lỗi `SHOP_OWNER_UNAVAILABLE` bằng thông điệp rõ.
* Không đổi `lib/api*`, store, routing.

## 3. Quy tắc song song (tóm tắt)

Phiên khác đang sửa nhiều file ở `features/shop/**` và `src/lib/api/generated/**`. Chỉ tạo file mới + chèn ngắn bằng `Edit`; không chạy `api:sync`.

## 4. Bước

* [x] Chép client Orval của endpoint mới (điều phối làm).
* [x] Hook `use-admin-shop-registration.ts` (ép `data: null` ở đúng một chỗ) + thẻ `shop-registration-card.tsx` (chèn một dòng vào `shop-profile-tab.tsx`) + hộp thoại Duyệt nhắc "người đăng ký thành chủ shop". Lỗi `SHOP_OWNER_UNAVAILABLE` hiện qua toast bằng message tiếng Việt của backend (sẵn có ở `useApproveShop`).
* [x] `lint` + `typecheck` xanh.
* [x] Thử với backend thật bằng trình duyệt (admin xem thẻ hồ sơ, duyệt, từ chối — 2026-10-15). Chưa thử riêng vai quản lý/bán hàng (không phải admin).
