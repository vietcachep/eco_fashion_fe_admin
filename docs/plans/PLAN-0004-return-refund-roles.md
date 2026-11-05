# PLAN-0004 — Đổi trả & hoàn tiền theo vai (shop xử lý · sàn phân xử · kế toán chi)

> Status: Done (2026-10-26) — `npm run verify` xanh; đã thử trình duyệt với backend cô lập: shop_owner (duyệt có giảm tiền, nhận hàng), accountant (ghi sổ, mã giao dịch trùng), sales/CSKH (phân xử), mobile 390px. Chưa thử riêng shop_staff có/không `shop.return.process`.
> Owner: Agent
> Plan gốc (hợp đồng API, RACI, máy trạng thái): `eco_backend/docs/plans/PLAN-0022-return-refund-roles.md` — đọc §2–§7 trước khi code.
> Quy trình: plan → code → test → review. Client Orval sinh từ `npm run api:sync` (backend dev cô lập do điều phối dựng); KHÔNG sửa tay `src/lib/api/generated/**`.

## 1. Vấn đề

Màn đổi trả hiện chỉ có nhân viên sàn duyệt/từ chối kiểu cũ (duyệt = hoàn tiền ngay). Backend đổi sang: **shop** duyệt/từ chối/xác nhận nhận lại hàng, **sàn (CSKH)** chỉ phân xử khi khiếu nại hoặc shop quá hạn, **kế toán** chi tiền hoàn. Mỗi vai chỉ thấy và làm đúng việc của mình.

## 2. Thiết kế theo vai

### Cổng shop (`(vendor)`)
* Route mới `/vendor/returns` (+ `/vendor/returns/[id]`), mục sidebar "Đổi trả" gắn quyền `shop.return.read`; thao tác ghi gắn `shop.return.process` (`PermissionGate`).
* Danh sách: tab trạng thái (Chờ duyệt · Chờ nhận hàng · Khiếu nại · Hoàn tất/Đóng), cột mã đơn, khách, lý do, **hạn xử lý còn lại** (đếm từ `deadlineAt`, đỏ khi < 12h), tiền hoàn.
* Chi tiết: minh chứng của khách, dòng hàng, lý do/mô tả, TK nhận hoàn (che số), mã vận đơn khách gửi, trạng thái hoàn tiền (`refund`), lịch sử. Nút theo trạng thái: **Duyệt** (hộp thoại: số tiền hoàn — chỉ được giảm, giảm thì bắt buộc lý do; hiện địa chỉ gửi trả khách sẽ thấy) · **Từ chối** (lý do ≥ 10 ký tự + ảnh) · **Đã nhận hàng** (chọn "đúng hàng" / "không khớp" + ghi chú + ảnh; "không khớp" nói rõ sẽ chuyển sàn phân xử). Hết hạn ⇒ banner "đã chuyển sàn".
* Chi tiết đơn của shop: đơn `shipping` có nút **Giao không thành công** (lý do: khách từ chối nhận / không liên lạc được / thất lạc / khác; ghi chú; "hàng đã về tay shop" ⇒ nhập kho lại; cảnh báo: đơn trả trước sẽ được hoàn đủ).
* Hiện `refund` ("đang hoàn tiền X ₫") trên chi tiết đơn khi có.

### Cổng nhân viên sàn (`(dashboard)`)
* `/order/returns` (đã có): mặc định lọc `escalated`; cột **nguồn khiếu nại** (`escalateSource`: khách khiếu nại / shop quá hạn duyệt / shop quá hạn nhận / shop báo hàng không khớp), shop, hạn; lọc theo shop.
* Chi tiết: toàn bộ bằng chứng của cả hai phía (khách + shop từ chối/nhận hàng) + dòng thời gian. Nút duy nhất **Phân xử** (chỉ khi `escalated`, quyền `order.return.process`): chọn *Hoàn tiền cho khách* (số tiền mặc định, được sửa ≤ tổng đơn − đã hoàn) / *Từ chối lần cuối*, **ghi chú bắt buộc**. XOÁ hộp thoại Duyệt/Từ chối kiểu cũ (Rule 4).
* Yêu cầu không phải `escalated` ⇒ chỉ xem (kèm nhãn "shop đang xử lý — hạn …").
* Chi tiết đơn: nhân viên có thể **huỷ đơn đang giao khi tranh chấp** (bắt buộc lý do).

### Kế toán (`/payment/refunds`)
* Cột/khối mới: TK nhận hoàn (che số, nguồn: "TK đã thanh toán" / "khách khai" / "chưa có"), trạng thái cổng (`gatewayStatus`), cờ **cần chuyển khoản tay** + nút nhập mã giao dịch; lỗi 409 `REFUND_PROVIDER_REF_DUPLICATE` ⇒ "Mã giao dịch đã được dùng cho khoản hoàn khác". Liên kết sang đơn và yêu cầu đổi trả. Lọc "cần xử lý tay".
* Kỳ chi trả (`/supplier/payouts` hoặc màn đang dùng): dòng trừ do hoàn tiền hiện **mã đơn** (link).

## 3. Phạm vi file (Rule 0/2)

* `src/features/order/components/returns/**` (sàn), `src/features/order/components/vendor/**` + route `src/app/(vendor)/vendor/returns/**` (shop), hooks bọc Orval trong `src/features/order/hooks/`, types tay trong `features/order/types/` nếu Orval thiếu schema.
* `src/features/payment/components/refunds/**` + hooks.
* `src/lib/constants.ts` (route + `PERMISSIONS` — chạy `npm run perms:sync` TRƯỚC để có mã mới `shop.return.*`), `src/lib/labels.ts` (nhãn + tông màu trạng thái mới, lý do, nguồn khiếu nại), `components/layout` sidebar (mục "Đổi trả" cổng shop).
* KHÔNG đụng `lib/api*`, store, `components/ui`, `globals.css`.

## 4. Bước

* [x] `api:sync` + `perms:sync` (điều phối) → commit file sinh.
* [x] Hooks bọc Orval + `invalidateByPath`: `use-returns.ts` (sàn: list/get/resolve) · `use-shop-returns.ts` (shop: list/get/approve/reject/receive) · `use-shop-orders.ts` (+ delivery-failed) · `use-orders.ts` (huỷ đơn kể cả `shipping`, lỗi `ORDER_HAS_OPEN_RETURN`) · `use-return-evidence.ts` (tải ảnh minh chứng) · `payment/hooks/use-payments.ts` (refunds `needsManual`, payee reveal, kiểm tra PayOS).
* [x] Cổng shop: danh sách + chi tiết + hộp thoại duyệt / từ chối / đã nhận hàng + nút Giao không thành công + `refund` trên chi tiết đơn + sidebar "Đổi trả" (`shop.return.read`; nút ghi `shop.return.process`).
* [x] Cổng sàn: viết lại danh sách (mặc định `escalated`, nguồn chuyển sàn, shop, hạn, lọc shop) + chi tiết + hộp thoại Phân xử; xoá hộp thoại duyệt/từ chối cũ + `processReturnSchema` + hook `useProcessReturn`; huỷ đơn `shipping` (lý do ≥ 10 ký tự).
* [x] Kế toán: refunds (TK nhận hoàn che số + nguồn, `gatewayStatus`, `needsManual` + lọc, Xem số TK, mã giao dịch trùng, link đơn/đổi trả, `processing` = "Đang chờ PayOS xác nhận") + dòng trừ kỳ chi trả mở đơn theo `orderCode`.
* [x] Nhãn/route/quyền (`lib/labels.ts`, `lib/constants.ts`); skeleton khớp layout; mobile 390px (bảng cuộn ngang, danh sách shop có thẻ ở màn hẹp).
* [x] `npm run verify` xanh.
* [ ] Thử trình duyệt với backend dev cô lập: vai shop_owner, shop_staff (có/không `shop.return.process`), sales (CSKH), accountant, admin. (điều phối thực hiện)

## 5. Ghi chú triển khai / quyết định

* Hàng đợi sàn (`/order/returns`) và hoàn tiền (`/payment/refunds`) **không còn bắt chọn shop trước** (`ShopScope`): đây là hàng đợi công việc xuyên shop (CSKH phân xử, kế toán chi) — mặc định thấy mọi shop, lọc shop là tuỳ chọn qua `features/shop/components/platform/shop-filter.tsx` (danh bạ `/admin/shop-directory`, CSKH/kế toán không có `supplier.shop.read` vẫn dùng được). Link từ dashboard (`?status=escalated`, `?status=requested`) nhờ đó vào thẳng hàng đợi.
* Tab "Tất cả" của `/order/returns` dùng khoá `all` (không phải chuỗi rỗng) để bộ lọc đồng bộ URL không rơi về mặc định `escalated`.
* Shop luôn gửi lại `returnAddress` khi duyệt yêu cầu cần trả hàng (điền sẵn từ `suggestedReturnAddress`, bắt buộc nhập nếu chưa có) — backend vẫn tự lấy địa chỉ gần nhất nếu thiếu.
* Dòng thời gian dựng từ các dấu mốc của response (backend không trả danh sách sự kiện): khách rút / hết hạn gửi hàng không có mốc riêng nên chỉ hiện ở trạng thái.
* `ReturnRequestResponse` không có tên khách / tổng đơn → danh sách shop hiện tóm tắt hàng thay cột "khách"; trần hoàn của sàn ("tổng đơn − đã hoàn") do backend kiểm (`ORDER_RETURN_REFUND_TOO_HIGH` hiện trong hộp thoại).
* Cuối kỳ sync, `CreateProductRequest`/`UpdateProductRequest` biến mất khỏi spec (PLAN-0021 sàn không tạo/sửa sản phẩm): `features/product` đổi sang `CreateShopProductRequest`/`UpdateShopProductRequest` (đúng hai kiểu vendor đang dùng) để biên dịch.
