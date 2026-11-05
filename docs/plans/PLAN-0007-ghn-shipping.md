# PLAN-0007 — Vận chuyển GHN cho cổng shop và sàn

> Status: In Progress · 2026-11-05 · Plan gốc: `eco_backend/docs/plans/PLAN-0043-ghn-shipping-final.md`.
> Chủ dự án đã yêu cầu triển khai song song cả ba repo; phạm vi file dùng chung (route, menu, nhãn, kiểu shipping) thuộc yêu cầu này.

## Luồng và phạm vi

Vendor cấu hình pickup/return → xác nhận/đóng gói đơn → yêu cầu GHN lấy hàng → xem mã/nhãn → hãng xác nhận lấy kiện → theo dõi hành trình. Cổng sàn xem danh sách/chi tiết, giả lập trên provider fake, kế toán xác nhận tiền COD thực về sàn.

Component → hook feature → fetcher Orval → customInstance dùng axios chung → backend. `src/types/shipping.ts` tái xuất DTO sinh từ OpenAPI vì dùng cả order/shop/shipping. Đã bỏ HTTP/DTO chép tay sau khi API phục vụ spec; không sửa tay generated. Quyền sinh từ catalog bằng `npm run perms:sync`.

## Công việc

- [x] Kiểu shipping, nhãn trạng thái, route/menu và khối hiển thị dùng chung.
- [x] Vendor: pickup/return theo danh mục địa chỉ, yêu cầu lấy/đối soát/nhãn; không cập nhật tay trạng thái carrier.
- [x] Sàn: danh sách phân trang/tìm/lọc, chi tiết sự kiện, simulator, form remittance có idempotency.
- [x] Sản phẩm: biến thể có cân nặng/kích thước tuỳ chọn, validation và payload.
- [x] `perms:sync` từ catalog backend, không gọi DB/secret.
- [ ] Kiểm typecheck/lint/build toàn repo sau thay đổi cuối.
- [x] API sync từ backend cô lập localhost:4031 (tiếp tục sync lần cuối sau sửa metadata page/parcel).
- [ ] Kiểm tích hợp/browser theo bằng chứng điều phối trên môi trường cô lập.

## Kiểm thử và giới hạn

Kiểm đúng quyền màn/nút/API 403, trạng thái chờ lấy khác đã bàn giao; không poll vô hạn, dùng Làm mới/refetch focus. Backend phải chặn lại mọi command. Chỉ mở nhãn https; phiếu HTML nội bộ nằm trong iframe sandbox. Chưa có bằng chứng browser không được ghi đã nghiệm thu GHN thật.

## Nhật ký

2026-11-05: triển khai frontend; focused eslint và typecheck ở lần giữa đã xanh, tiếp tục verify cuối. Không tạo dữ liệu mẫu vận hành hay commit/push.
