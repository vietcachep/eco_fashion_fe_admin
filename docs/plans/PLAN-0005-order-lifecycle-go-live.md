# PLAN-0005 — Web quản trị trong đợt go-live vòng đời đơn (trỏ về PLAN-0023)

> Status: Ready · Plan gốc + luật phiên: `eco_backend/docs/plans/PLAN-0023-order-lifecycle-go-live.md` (§5 luật, §6 khoá file nóng, §7 review, §8 báo cáo)
> Luật nghiệp vụ: `eco_backend/docs/10_ORDER_LIFECYCLE.md` · kịch bản (mã B = trình duyệt): `eco_backend/docs/11_SCENARIO_CATALOGUE.md`
> Phần FE của mỗi WP do **chính phiên WP đó** làm, SAU khi phiên điều phối chạy `api:sync` + `perms:sync` cho cả đợt (không tự `api:sync` giữa đợt).

## Việc FE theo WP (web quản trị)

| WP | Cổng sàn `(dashboard)` | Cổng shop `(vendor)` |
|---|---|---|
| 01 | Hoàn tiền: nhãn `mismatch`; chi tiết thanh toán: `receivedAmount`, giao dịch lệch | — |
| 02 | `/shop/payouts`: trạng thái `awaiting_approval/unknown/held/deferred`, Duyệt, Kiểm tra PayOS, đánh dấu tay có xác nhận, chạy theo shop, giữ/mở giữ; chi tiết shop: xác minh TK ngân hàng | `/vendor/shop`: đổi TK cần mật khẩu + thông báo giữ 72h; `/vendor/payouts`: trạng thái mới |
| 03 | Huỷ `packing`; tab "Vi phạm" ở chi tiết shop; dialog khoá shop hiện đơn đang mở | `/vendor/orders`: cột hạn xác nhận/giao đếm ngược, yêu cầu huỷ (chấp nhận/từ chối), gia hạn giao, huỷ `packing`, mã lý do; trang vi phạm |
| 04 | Chuông + `/notifications`; cài đặt thông báo; **cập nhật `AGENTS.md` Rule 1** (ngoại lệ polling số chưa đọc 60s) | Chuông + `/vendor/notifications`; cài đặt thông báo |
| 05 | `/order/orders` tìm toàn sàn (bỏ `ShopScope` bắt buộc), dòng thời gian đơn, `/system/audit-logs`, outbox lỗi, dashboard theo vai, nút xuất CSV | Dòng thời gian rút gọn; dashboard shop thêm số đếm |
| 06 | Chi tiết kỳ: dòng `COD_WALLET_TOPUP`, trợ giá sàn, sao kê (CSV + in); `/shop/wallets`: nợ quá hạn, rút cọc chờ duyệt | `/vendor/wallet`: ngưỡng, cảnh báo, yêu cầu rút cọc; `/vendor/payouts/[id]`: sao kê (CSV + in) |
| 07 | Hàng đợi "nghi thất lạc"; cờ dùng lại mã vận đơn | Dialog giao (hãng + mã vận đơn), đã giao (ảnh tuỳ chọn), giao thất bại (mã lý do), "Hàng đã về kho" |
| 08 | Panel khách hàng trong chi tiết đơn: hồ sơ COD + mở khoá | — |
| 09 | Hộp thoại Phân xử dùng `maxRefundAmount`; hiện phí gửi trả, `customerName` | Chi tiết đổi trả: phí gửi trả + biên nhận |
| 10 | `/payment/reconciliation`; `/reporting/commission`; nhập sao kê | — |

WP-11 (pháp lý/thuế/hoá đơn) và WP-12 (dữ liệu cá nhân): **ngoài phạm vi** — dự án demo, chỉ tập trung luồng mua bán end-to-end.

## Luật riêng repo này (nhắc lại)

- Hook bọc Orval trong `features/<m>/hooks/`; 3 lớp quyền (`PermissionGuard` / `PermissionGate` / `ApiErrorState` + `isForbiddenError`); không import chéo feature (dùng chung ⇒ `components/shared`); nhãn/tông màu trạng thái mới ở `lib/labels.ts`; route/quyền ở `lib/constants.ts` (khối có comment `// PLAN-00yy`).
- Bảng dùng `data-table.tsx`, tab `filter-tabs.tsx`, xác nhận `confirm-dialog.tsx`; skeleton khớp layout; dùng được ở 390px.
- Kiểm thử trình duyệt trên bản sao `D:\fitly-e2e\admin` (cổng 3401) trỏ backend cô lập (PLAN-0024 §2.5); không dùng chung tab với phiên khác.
- Done: `npm run verify` xanh + ảnh chụp các mã B của WP theo từng vai.

## Phát hiện từ audit E2E (2026-10-27) — việc FE quản trị

> Nguồn: `eco_backend/docs/13_E2E_TEST_REPORT.md` §4–§5. Thử thật trên bản dev (:3401) với vai khách → cổng nhà bán → kế toán.

**Đã đạt (không cần sửa):** cổng vendor — danh sách có nhãn "Cần xử lý ngay", chi tiết, Xác nhận → Bắt đầu đóng gói → Giao cho vận chuyển (link theo dõi bắt buộc `https://`) → Đã giao thành công / Giao không thành công; ở `packing` không có nút Huỷ (khớp backend hiện tại); kế toán `/payment/refunds` — Hoàn tiền → "Đang chờ PayOS xác nhận" → "Kiểm tra PayOS" → "Đã hoàn"; hoàn cần chuyển tay hiển thị "Cần chuyển tay"; 429 hiện đúng thông báo tiếng Việt.

- [x] **AUD-03 (P0) — form đổi TK ngân hàng cổng nhà bán đòi mật khẩu (đã làm 2026-10-27):** `shop-bank-account-card.tsx` thêm ô "Mật khẩu đăng nhập của bạn"; `shop-bank-schema.ts` thêm `currentPassword` (bắt buộc); `use-shop-profile.ts` khai `UpdateMyShopBody = UpdateShopProfileRequest & { currentPassword?: string }` (điểm ép kiểu duy nhất, chờ `api:sync` sinh trường này). Backend trả 400 `SHOP_BANK_PASSWORD_REQUIRED/INVALID` (toast hiển thị thông điệp backend); 429 khi dò mật khẩu quá 10 lần/10 phút. **Đã thử trên trình duyệt (bản dev trỏ backend cô lập, vai chủ shop Nhà Xinh):** mật khẩu sai ⇒ toast "Mật khẩu không đúng", form giữ nguyên, TK không đổi; mật khẩu đúng ⇒ "Đã cập nhật tài khoản ngân hàng — chi trả tạm giữ 24 giờ", thẻ hiện `••••8899` + tên chủ TK mới. `lint` 0 lỗi, `typecheck` sạch, `next build` xanh. FE bản cũ (chưa có ô mật khẩu) đổi TK sẽ bị từ chối 400 — an toàn nhưng phải triển khai FE cùng đợt với backend.
- [x] **AUD-09 / G77 — màn `/shop/payouts` lạc hậu so với backend (ĐÃ LÀM 2026-10-27 — kiểm trình duyệt vai kế toán)** (sau khi điều phối chạy `api:sync` + `perms:sync`):
  - Spec `openapi/api-docs.json` thiếu `POST /admin/payouts/{id}/approve | /reconcile | /release` (backend đã có) ⇒ thêm hook `features/shop/hooks/use-admin-payouts.ts` + nút trong `payout-detail-sheet.tsx`: **Duyệt** (`awaiting_approval`), **Đối chiếu PayOS** (`processing`/`unknown`), **Mở giữ** (`held`, báo lý do khi bị từ chối), **Thử lại** như cũ.
  - `PAYOUT_TABS` (`payouts-screen.tsx`) chỉ có Chờ chi / Đang chi / Đã chi / Chi lỗi / Mang nợ / Không phát sinh ⇒ thêm **Chờ duyệt · Không rõ kết quả · Đang giữ · Dồn kỳ sau** (nhãn trạng thái đã có trong `lib/labels.ts`).
  - Chi tiết kỳ `held`: hiển thị lý do giữ (shop bị khoá / giữ sau đổi TK / giữ tay) và thời điểm có thể mở giữ.
  - Cột **Gian hàng** hiện `Shop …de93db6c` vì kế toán không có `shop.read` (`useAdminShopOptions` 403) ⇒ dùng `shopName` do backend trả trong kỳ chi/hoàn tiền (xem PLAN-0026 AUD-09), bỏ gọi danh sách shop khi thiếu quyền.
- [ ] Thông báo cho nhân viên: chuông/hộp thư theo vai (G47) — hiện nhân viên sàn nhận "Đơn mới" mỗi đơn con (spam, xem PLAN-0028); FE nên dùng số đếm hàng đợi trên dashboard thay vì thông báo từng đơn.
- Chạy lại trình duyệt theo vai (kế toán, CSKH, chủ shop, NV shop) sau khi sửa; không bỏ qua mục này khi báo "xong" (AGENTS.md — Done Definition).

## Tiến độ FE (2026-10-27 — sau `api:sync` + `perms:sync` từ backend đã kiểm)

Đã làm (cả `lint` + `typecheck` + `next build` xanh):
- **WP-01/02 (tài chính):** `/shop/payouts` — tab Chờ duyệt · Không rõ kết quả · Đang giữ · Chờ dồn/Đã dồn kỳ sau; chi tiết kỳ hiện `holdReason`/`gatewayStatus` + nút Duyệt · Đối chiếu PayOS · Mở giữ (409 hiện NGUYÊN VĂN lý do) · Thử lại · Đánh dấu đã chi (ô xác nhận `confirmGatewayNotExecuted`); cột shop dùng `shopName`/`shopCode`; giữ tay chi trả (tạo/mở/lịch sử) + chạy kỳ theo shop; `/payment/refunds` — nhãn `mismatch`, cột Gian hàng/Cách hoàn, đối soát `needsReconcile` + 409, "Ghi sổ nốt", ghi chú COD không tự chi; thanh toán hiện `receivedAmount`; ví `cod_reversal`.
- **WP-02 (shop):** thẻ TK ngân hàng chủ shop — số giờ giữ thật (`bankChangeHoldHours`), banner chờ xác minh, hướng dẫn tài khoản Google; chi tiết shop phía sàn — so sánh tên chủ shop ↔ tên chủ TK + nút "Xác minh tài khoản"; kiểu tạm `UpdateMyShopBody` đã xoá.
- **WP-03:** `/vendor/orders` cột hạn xác nhận/giao đếm ngược + nhãn "Khách yêu cầu huỷ"; chi tiết đơn — yêu cầu huỷ (Chấp nhận/Từ chối), Gia hạn giao, Huỷ đơn có mã lý do + cảnh báo +1 điểm (quyền `shop.order.cancel`, đã thêm vào hộp thoại giao quyền nhân viên); `/vendor/violations` + tab "Vi phạm" ở chi tiết shop; hộp thoại khoá shop hiện số đơn mở; phía sàn huỷ `packing`/`shipping` với mã lý do; `/order/orders` tìm toàn sàn (bỏ `ShopScope` bắt buộc).
- **WP-07 (FE):** dialog giao bắt buộc hãng + mã vận đơn; hiện hãng/mã/link ở chi tiết đơn; giao thất bại 6 mã lý do; "Hàng đã về kho"; đổi trả COD "chưa nhận hàng" ⇒ nhãn "Đã đảo ghi thu COD".
Chưa làm: dashboard số đếm hàng đợi tài chính (backend `reporting` chưa trả field), "thời điểm có thể mở giữ" của kỳ `held`, WP-04 (chuông/`/notifications` theo vai), WP-05, WP-06, WP-08, WP-09 phần FE, WP-10. Link "Quên mật khẩu" bấm được cho tài khoản Google cần đổi `GuestGuard` (chủ dự án quyết).
