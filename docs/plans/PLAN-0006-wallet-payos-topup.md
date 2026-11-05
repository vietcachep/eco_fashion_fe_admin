# PLAN-0006 — Nạp cọc ví qua PayOS (giao diện cổng chủ shop + trang quay lại)

> Status: In Progress (WP-1F + WP-6 xong phần FE vendor; WP-7 cổng sàn chưa làm). Cập nhật 2026-11-03: PayOS là đường nạp DUY NHẤT của chủ shop (§2a)
> Owner: Agent code FE (theo gói WP) · điều phối viên chạy kiểm trên trình duyệt
> Related Phase: Go-live — tiền vào ví cọc COD (nối PLAN-0020 ví cọc)
> Plan gốc (BE + hợp đồng + nhãn + kịch bản trình duyệt B1–B14): `eco_backend/docs/plans/PLAN-0041-cod-deposit-payos.md` (§5, §7, §8.1–8.2, §9.3, WP-6)
> Related Docs: `AGENTS.md` (Rule 1: ngoại lệ polling trang quay lại), `docs/plans/PLANS_TEMPLATE.md`

---

## 1. Goal

Chủ shop nạp tiền vào ví đặt cọc COD ngay trên `/vendor/wallet` qua trang thanh toán (PayOS), không phải chờ kế toán đối chiếu chuyển khoản tay.
Luồng: nhập số tiền → tạo link PayOS → chuyển sang trang PayOS → PayOS đưa về `/vendor/wallet/payos-return` → màn hình hiển thị đúng kết quả backend trả. Ví được cộng bởi backend, FE không tự cộng tiền.

Luồng nạp tay (chuyển khoản, chờ sàn duyệt) đã bỏ khỏi màn chủ shop theo quyết định 2026-11-03 (§2a).

---

## 2. Context

* Backend đã chốt hợp đồng ở PLAN-0041 §5.1 và §5.3: `POST/GET /shop/wallet/topups…`, `GET /shop/wallet` có thêm `payosTopup{enabled,minAmount,maxAmount,active}`.
* Lớp dữ liệu FE (WP-1F): `features/shop/types/wallet-topup.ts`, `features/shop/hooks/use-wallet-topups.ts`, nhãn `TOPUP_STATUS` ở `lib/labels.ts`, route `ROUTES.vendor.walletPayosReturn`.
* Hook gọi thẳng qua `customInstance` vì client Orval chưa có route `/topups` (D18 của PLAN-0041). Sau `api:sync`, chuyển sang hook sinh ra là tuỳ chọn.
* Tiền: chuỗi số nguyên VND từ backend, hiển thị bằng `formatVnd`. Không cộng trừ tiền ở giao diện.

---

## 2a. Quyết định 2026-11-03 (chủ dự án): PayOS là đường nạp DUY NHẤT của chủ shop

* Chủ shop CHỈ nạp tiền vào ví qua PayOS. Đã bỏ khỏi màn chủ shop: nút "Nạp bằng chuyển khoản", hộp thoại nộp cọc tay, tab "Yêu cầu nộp cọc", và đoạn hướng dẫn chuyển khoản (`w.instructions`). Hai nút cùng là chuyển khoản nên gây khó hiểu.
* Khi `payosTopup.enabled = false` (cờ tắt hoặc PayOS chưa cấu hình): KHÔNG còn đường dự phòng. Màn hiện khối trung tính "Nạp tiền vào ví đang tạm thời không khả dụng. Vui lòng liên hệ sàn." (số dư và lịch sử vẫn xem được). Khối này nằm trong `PermissionGate` quyền `shop.wallet.deposit_request`.
* Luồng tay chỉ còn ở PHÍA SÀN (`/shop/wallets`, tab "Khoản nộp cọc") để xử lý các khoản đã gửi từ trước. Không xoá các tab/nút đó.
* Chữ hiển thị cho chủ shop không dùng "PayOS": dùng "nạp tiền", "thanh toán". Mã PayOS hiển thị dưới nhãn "Mã giao dịch".
* Gỡ khỏi FE: `useMyDeposits`, `useRequestDeposit` (`hooks/use-wallet.ts`) và `DepositRequestInput` (`types/wallet.ts`), vì chỉ luồng tay dùng. Hook của màn sàn trong cùng file giữ nguyên.
* Hệ quả cần biết: kịch bản B1 và B9 trong PLAN-0041 §9.3 còn mô tả đường chuyển khoản tay ở màn chủ shop; điều phối viên cập nhật theo mục này trước khi kiểm trình duyệt.

## 3. Scope

### In Scope
* `/vendor/wallet`: nút "Nạp tiền vào ví" (khi `payosTopup.enabled`; ngược lại là khối thông báo không khả dụng), thẻ khoản nạp đang chờ, tab "Lịch sử nạp tiền", dòng ghi chú.
* `/vendor/wallet/payos-return`: trang kết quả sau khi PayOS đưa chủ shop về.
* `AGENTS.md` Rule 1: ghi ngoại lệ polling của trang quay lại.

### Out of Scope
* Cổng sàn `/shop/wallets` tab "Nạp qua PayOS" (WP-7, plan riêng khi làm).
* Đổi hook WP-1F, `lib/api*`, `lib/api/generated/**`, store, mã quyền (không thêm mã mới).
* Chuyển sang hook Orval sinh ra (tuỳ chọn, sau `api:sync`).

---

## 4. Affected Features / Areas

* `features/shop/components/vendor/`: `vendor-wallet-screen.tsx` (sửa), `active-topup-card.tsx`, `topup-dialog.tsx`, `my-topups-table.tsx`, `topup-return-screen.tsx` (mới).
* `app/(vendor)/vendor/wallet/payos-return/page.tsx` (mới).

---

## 5. Routes & Screens

```text
(vendor)/vendor/wallet                 # ví: nạp tiền vào ví qua PayOS (đã có, sửa)
(vendor)/vendor/wallet/payos-return    # trang quay lại từ PayOS (mới)
```

* `/vendor/wallet/payos-return` nhận `?code=&id=&cancel=&status=&orderCode=` từ PayOS. Chỉ `orderCode` (cắt 32 ký tự, phải là chữ số) và cờ huỷ được dùng để hiển thị. Kết luận luôn lấy từ backend.
* Page bọc `RoleGuard` + `PermissionGuard(shopWalletRead)`. `searchParams` là Promise (Next 16), đọc bằng `await`.

---

## 6. API Integration

```text
GET    /api/v1/shop/wallet                              (đã có; trả thêm payosTopup)
POST   /api/v1/shop/wallet/topups          {amount}     → tạo link PayOS (reused: true nếu còn khoản mở)
GET    /api/v1/shop/wallet/topups?page&size
GET    /api/v1/shop/wallet/topups/:id                   → kiểm tra lại (backend hỏi PayOS khi còn mở)
GET    /api/v1/shop/wallet/topups/by-order-code/:code   → trang quay lại (poll 3 giây, tối đa 180 giây)
POST   /api/v1/shop/wallet/topups/:id/cancel            → huỷ link (pending|partial)
```

* Mọi call qua `customInstance` (`lib/api/mutator.ts`). Query key bắt đầu bằng `/api/v1/shop/wallet` để `invalidateByPath` làm mới đúng.
* Lỗi nghiệp vụ đọc bằng `apiErrorCode` (`WALLET_TOPUP_DISABLED|UNAVAILABLE|LINK_FAILED|IN_PROGRESS`), HTTP 429 bằng `apiStatus`.

---

## 7. State & Forms

* Hook: `useCreateTopup`, `useMyTopups`, `useMyTopup`, `useMyTopupByOrderCode`, `useCancelTopup` (WP-1F).
* Đồng hồ đếm ngược: `useNow` cục bộ trong `active-topup-card.tsx` (nhích 30 giây). Không import từ feature order.
* Form: RHF + Zod `z.string().regex(/^[1-9]\d{0,13}$/)` + `refine` min/max (lấy từ `payosTopup`). Ô số tiền dùng `setValueAs` bỏ ký tự không phải chữ số.
* Không `setState` trong `useEffect` để reset: dialog tách theo lần mở (mount/unmount), thẻ dùng `key` theo khoản.

---

## 8. Implementation Steps

* [x] Step 1 (WP-1F): types, hooks, `TOPUP_STATUS`, route constant.
* [x] Step 2: `active-topup-card.tsx` — thẻ link đang chờ (mở trang PayOS, kiểm tra lại, huỷ có xác nhận, ẩn khi hết hạn theo đồng hồ, làm mới ví khi khoản đã chốt).
* [x] Step 3: `topup-dialog.tsx` — nhập số tiền, gợi ý, Zod, chuyển sang PayOS; gợi ý inline theo mã lỗi.
* [x] Step 4: `my-topups-table.tsx` — lịch sử, phân trang server, dòng phụ khi đóng mà đã ghi có.
* [x] Step 5: `topup-return-screen.tsx` — mọi trạng thái, poll 3 giây tới 180 giây, lỗi 403/404/mạng.
* [x] Step 6: `app/(vendor)/vendor/wallet/payos-return/page.tsx`.
* [x] Step 7: `vendor-wallet-screen.tsx` — nút nạp tiền vào ví, thẻ, tab lịch sử, ghi chú.
* [x] Step 7b (2026-11-03): bỏ luồng chuyển khoản tay khỏi màn chủ shop; khối không khả dụng khi PayOS tắt; đổi chữ hiển thị; gỡ `useMyDeposits`/`useRequestDeposit`/`DepositRequestInput` (§2a).
* [x] Step 8: `AGENTS.md` Rule 1 (ngoại lệ polling).
* [ ] Step 9 (điều phối viên): `npm run api:sync` + `perms:sync` sau khi BE xong; kiểm trên bản sao `D:\fitly-e2e\admin` theo B1–B5, B10, B13 (PLAN-0041 §9.3).

---

## 9. Validation / Test Plan

* [ ] `npx eslint` các file đã đổi sạch.
* [ ] `npx tsc --noEmit` sạch.
* [ ] Kịch bản trình duyệt B1–B5, B10, B13 (vai chủ shop và nhân viên shop, 390px) đạt.
* [ ] Không import chéo feature; không polling ngoài trang quay lại.
* [ ] Shop không có quyền `shop.wallet.deposit_request` không thấy nút nạp (PermissionGate).

---

## 10. Risks / Notes

* Risk: trang quay lại poll trong 180 giây; ngoài cửa sổ này phải bấm "Kiểm tra lại". Đây là ngoại lệ đã ghi ở `AGENTS.md`.
* Risk: `DataTable` bọc trong `overflow-hidden`; bảng 5 cột có thể bị cắt ở 390px. Cần kiểm trực quan (B13).
* Assumption: cờ `wallet.payos_deposit_enabled` mặc định tắt (PLAN-0041 D10); khi tắt, màn hiện khối "không khả dụng" thay cho nút (§2a).
* Open question: kịch bản B4 yêu cầu bấm "Nạp qua PayOS" lại được khi còn link mở, nhưng §8.1 yêu cầu nút disabled. Bản này làm theo §8.1 (disabled + ghi chú); nhánh `reused` vẫn xử lý trong dialog.
* Risk: kịch bản B1 và B9 của PLAN-0041 §9.3 còn mô tả chuyển khoản tay ở màn chủ shop; cần cập nhật theo §2a trước khi kiểm trình duyệt.

---

## 11. Progress Log

| Date       | Progress          | Notes                                                          |
| ---------- | ----------------- | -------------------------------------------------------------- |
| 2026-11-03 | WP-1F + WP-6 (FE vendor) | Thêm 4 component, trang quay lại, sửa màn ví, ngoại lệ polling |
| 2026-11-03 | Quyết định: PayOS là đường nạp duy nhất | Bỏ luồng chuyển khoản tay khỏi màn chủ shop; khối không khả dụng khi PayOS tắt; đổi chữ hiển thị; gỡ code luồng tay (FE) |

---

## 12. Files Changed

```text
src/features/shop/hooks/use-wallet.ts   (sửa 2026-11-03: gỡ useMyDeposits/useRequestDeposit)
src/features/shop/types/wallet.ts       (sửa 2026-11-03: gỡ DepositRequestInput)
src/features/shop/components/vendor/vendor-wallet-screen.tsx   (sửa)
src/features/shop/components/vendor/active-topup-card.tsx      (mới)
src/features/shop/components/vendor/topup-dialog.tsx           (mới)
src/features/shop/components/vendor/my-topups-table.tsx        (mới)
src/features/shop/components/vendor/topup-return-screen.tsx    (mới)
src/app/(vendor)/vendor/wallet/payos-return/page.tsx           (mới)
AGENTS.md                                                       (sửa Rule 1)
docs/plans/PLAN-0006-wallet-payos-topup.md                      (mới)
```

---

## 13. Follow-up Tasks

* [ ] WP-7: tab "Nạp qua PayOS" cổng sàn `/shop/wallets` (xem-only).
* [ ] Gộp `useNow` (hiện có ở `features/order/hooks/use-now.ts` và bản cục bộ ở `active-topup-card.tsx`) vào `src/hooks/` khi có chủ dự án đồng ý (Rule 2).
* [ ] Sau `api:sync`: cân nhắc chuyển các hook `use-wallet-topups.ts` sang hook sinh ra.
* [ ] `app/(vendor)/vendor/wallet/page.tsx` (ngoài danh sách WP-6): mô tả trang còn chữ "Nộp cọc cho sàn…". Cần một dòng đổi nếu chủ dự án muốn.
* [ ] Chữ còn nhắc "link" hoặc "PayOS" ngoài màn chủ shop, chỉ đổi khi được duyệt (WP-1F, không sửa trong đợt này): `wallet-labels.ts` (`topup_payos`, màn sàn vẫn dùng), `lib/labels.ts` `TOPUP_STATUS` ("Đang tạo link", "Tạo link lỗi"), thông báo của `use-wallet-topups.ts` ("Đã huỷ link nạp cọc.", "Không tạo được link nạp cọc.").

---

## 14. Definition of Done

* [ ] `npm run verify` xanh (điều phối viên chạy).
* [ ] Feature-first giữ nguyên; API qua `customInstance`; query key đúng tiền tố.
* [ ] Kịch bản B1–B5, B10, B13 đạt trên trình duyệt.
* [ ] Plan checklist và progress log được cập nhật.
