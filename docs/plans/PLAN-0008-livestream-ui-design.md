# PLAN-0008 — Thiết kế studio shop và quản trị FITLY Live

> Status: Implemented — đang kiểm chứng tích hợp với backend/media local · 2026-11-06
> Bản tổng: [Backend PLAN-0045](../../../eco_backend/docs/plans/PLAN-0045-livestream-commerce-design.md).
> Storefront: PLAN-0015-livestream-ui-design.md ở fashion_frontend_user.
> Rà soát lần2: [biên bản mua hàng/lỗi](../../../eco_backend/docs/plans/PLAN-0045-livestream-review-2026-11-06.md); chỉ cập nhật thiết kế.
> Quyết định cuối: [FITLY A+B và voucher V1](../../../eco_backend/docs/plans/PLAN-0045-livestream-final-decisions.md); đã chốt theo uỷ quyền chủ dự án, bỏ yêu cầu giống Shopee hoàn toàn.

## 1. Goal / Context

Chủ dự án chốt FITLY Live theo khuyến nghị, tương thích hai cổng vendor/platform, không cần giống Shopee hoàn toàn. Chuẩn là UX FITLY và nghiệp vụ E2E của A+B. Bản thiết kế được triển khai sau khi chủ dự án uỷ quyền code song song ngày 2026-11-06.

### Ghi nhận triển khai

- Có tám route vendor/platform với route guard, lọc thao tác theo quyền và phản hồi lỗi 403 từ backend. Danh sách phân trang server 15 dòng; tìm/lọc đồng bộ URL.
- Studio sử dụng camera/micro thật qua LiveKit, preview và đổi thiết bị, phát thử bằng phiên riêng do backend cấp, phát công khai, nối lại và kết thúc. SDK chỉ tải khi dùng; dừng track và rời phòng khi đóng màn hoặc mất quyền.
- Chat Socket.IO dùng token, retry giữ clientMessageId và tải snapshot HTTP sau nối lại. Sản phẩm giữ displayNumber, sắp xếp/pin theo version; phân công tối đa 10 nhân viên đủ quyền.
- Campaign shop yêu cầu cả quyền quản lý live và khuyến mãi. Sàn tạo/thu hồi campaign theo quyền promotion. Tiền/đơn trong báo cáo lấy backend; không tự ước lượng doanh thu.
- REST sử dụng client Orval từ OpenAPI backend; SDK media và socket tách khỏi luồng REST. Đã đồng bộ 104 mã quyền từ catalog backend.
- Cần cấu hình `NEXT_PUBLIC_LIVE_SOCKET_URL` đến origin backend hỗ trợ WebSocket khi REST chạy qua proxy Next.js; LiveKit serverUrl/token do backend cấp, không đưa secret media vào frontend.
- Chưa coi việc build thành công là bằng chứng video hai đầu, thiết bị thật hoặc E2E thanh toán. Kết quả kiểm chứng tích hợp được ghi riêng sau khi chạy môi trường audit.

### Kiểm chứng admin local ngày 2026-11-06

- `npm run verify`: lint không lỗi (4 cảnh báo React Compiler đã có ở các feature khác), TypeScript và production build 76 trang thành công.
- `node scripts/audit/live-admin-browser.mjs`: bảy màn vendor/platform tại viewport 390px không tràn ngang; camera preview qua LiveKit SDK nhận video 1280px và track ở trạng thái live. Chrome audit dùng thiết bị giả của trình duyệt, không phải camera phần cứng.
- Đã xem ảnh màn studio mobile; sửa cảnh báo Base UI khi Link render như Button bằng `nativeButton={false}`. Audit chạy lại thành công sau sửa.
- Audit dùng database/tài khoản cục bộ riêng, tạo nháp rồi huỷ, chỉ đóng browser context do script tạo. Không dùng GHN, thanh toán, môi trường triển khai hoặc secret thật. Publisher/subscriber hai đầu được backend media audit kiểm riêng; chưa tuyên bố đã bấm phát công khai từ UI admin trong lượt kiểm này.

## 2. Scope và nhận diện

Giữ Sidebar/Header theo scope vendor/platform, font sans, coral primary, nền nhẹ và sidebar than tối của FITLY. Dùng shadcn Table/Card/Sheet/Dialog/Tabs và RHF+Zod theo framework. Không đưa Bootstrap/Vineta vào admin. Màn studio có video tối nhưng phần form/table giữ theme admin; không thay global theme.

Phạm vi giao demo gồm toàn bộ A+B: phiên nháp/lịch, setup, phát thử/phát thật, sản phẩm, chat/moderation, voucher V1, kết thúc, báo cáo, sàn xử lý. C là backlog ngoài demo cho OBS/replay/game/xu/affiliate/đồng dẫn; không hiện nút giả và không coi C là cổng chặn A+B.

## 3. Routes & Screens

| Màn | Route dự kiến | Thành phần |
|---|---|---|
| V01 Danh sách | /vendor/livestreams | Bộ lọc URL, tab trạng thái, bảng phân trang, Tạo phiên |
| V02 Tạo/sửa | /vendor/livestreams/new; /[id]/edit | Thông tin, hàng, ưu đãi, lịch; Lưu nháp/Tiếp tục |
| V03 Preview | /vendor/livestreams/[id]/studio | Camera/micro, ảnh preview, kiểm thiết bị/mạng, Bắt đầu |
| V04 Điều hành | Cùng studio | Video host, pin hàng, chat, nhân viên, kết nối, Kết thúc |
| V05 Dữ liệu | /vendor/livestreams/[id]/report | Phễu, đồng thời cao nhất, đơn/tiền và huỷ/hoàn |
| V06 Moderator | Panel trong studio | Thành viên được phân công và quyền từng người |
| A01 Giám sát | /livestream/sessions | Shop, trạng thái, thời điểm, số đang xem, mở phiên |
| A02 Xử lý | /livestream/reports; /sessions/[id] | Báo cáo, xem phiên, lịch sử, force-stop/restrict |

Sidebar vendor thêm nhóm Livestream: Phiên, Lịch, Dữ liệu. Sidebar platform thêm nhóm Livestream: Phiên phát, Báo cáo. Filter cùng URL theo use-list-state; sidebar/nút lọc theo mã quyền mới sau khi catalog được triển khai và đồng bộ.

## 4. Thiết kế màn và thao tác

### V01/V02 — danh sách và chuẩn bị

- Bảng: tên/bìa, lịch, trạng thái, số sản phẩm, thời điểm phát, thao tác. Nháp được sửa/huỷ; phiên đã kết thúc mở dữ liệu, không “phát lại” bằng cùng ID.
- Form: tiêu đề, mô tả, ảnh bìa, ngành tham chiếu, lịch/timezone Asia/Bangkok, bật nhắc follower; validate tường minh, ảnh preview, giới hạn theo contract tương lai. Khách thấy giờ đã định dạng, không nhận timestamp thiếu timezone.
- Chọn hàng thuộc shop đã duyệt: tìm/phân trang, chọn nhiều, xem selection và thứ tự, loại hàng bị ẩn/hết quyền. Không tải tất cả catalog để lọc client.
- Gắn voucher là thao tác trên campaign có quyền; không dùng mã voucher bất kỳ của shop khác. Chưa có campaign hợp lệ thì có empty state, không tạo ưu đãi giả.
- Lưu nháp trước khi tới thiết bị. Rời form dirty cảnh báo mất thay đổi; lỗi API giữ input và chỉ rõ field.
- Sửa/huỷ lịch tăng scheduleVersion, job/thông báo cũ được bỏ qua. Deep link lịch đã huỷ hiển thị đã huỷ, không tự mở phiên khác. Theo dõi/tắt nhắc được kiểm khi gửi, không spam follower sau mỗi reconnect.

### V03/V04 — preview và điều hành

Desktop: video trái, chat phải, danh sách sản phẩm phía dưới; thanh trạng thái và Kết thúc trên. Wireframe bản tổng §5.4. Mobile390: video trên, tab Sản phẩm/Bình luận/Dữ liệu dưới; sidebar vẫn Sheet hiện tại.

- Camera/micro chỉ xin quyền khi host bấm, có chọn thiết bị và kiểm âm thanh. Người chưa cấp quyền chưa thể phát, lỗi có hướng dẫn/thử lại.
- Tách Preview camera tại máy khỏi Phát thử riêng qua media thật. Phát thử có phòng access-controlled/TTL, không lên discovery, không thông báo follower, không nhận voucher/đặt đơn/doanh thu thật, không lưu replay; có nhãn dữ liệu thử. Kết thúc thử dọn room; phát thật dùng session mới.
- Bắt đầu có trạng thái đang khởi động, chỉ live khi có media thật. Bấm lặp/reload không tạo phòng mới. Mở studio ở máy thứ hai cần xác nhận tiếp quản publisher; moderator không có quyền tiếp quản.
- Ghim hàng: một món tại một thời điểm, số thứ tự trùng phía khách. Hết hàng tự cập nhật trạng thái mua; không làm biến mất lựa chọn đang mua ở phía khách.
- Số hiển thị cố định xuyên phiên, khác position; không đổi số khi kéo thứ tự/bỏ rồi thêm lại và không cấp số cũ cho món khác. Khi xoá món ghim phải unpin theo version, không chuyển ngầm món khách đang chọn.
- Chat: phản hồi theo tin, ghim một thông báo, xoá/cấm với scope rõ. Trước cấm có xác nhận user/duration/reason; không biến quyền moderator thành quyền khoá tài khoản toàn sàn.
- Xếp thứ tự bằng kéo hoặc nút lên/xuống. Thêm/bỏ hàng trong live phải báo kết quả, không reset player.
- Kết thúc là destructive action riêng, dialog nêu phiên sẽ dừng cho mọi người; không đặt sát Tắt mic. Sau kết thúc tới V05; đơn đang thanh toán vẫn tiếp tục.
- Trạng thái mạng/track thực, không dùng timer giả làm “kết nối tốt”. Host đang reconnect thì hiện thời gian phục hồi từ BE, không tự quyết trạng thái terminal ở FE.

### V05 — báo cáo

Tách lượt vào, viewer unique, online peak, click món, đơn tạo, đơn thanh toán, huỷ/hoàn. Mọi tiền do BE trả; không cộng tiền ở bảng client. Khi dữ liệu đang tổng hợp, có thời điểm cập nhật/đang xử lý, không hiển thị0 như kết quả cuối. Đơn nguồn live có link đúng /vendor/orders/[code], vẫn áp scope shop; nhân viên không có quyền báo cáo không được xem doanh thu.

### A01/A02 — sàn

Bảng phiên + hàng đợi báo cáo là hai màn khác nhau. Nhân viên chọn báo cáo→xem nội dung và lịch sử→bỏ qua/yêu cầu xử lý/force-stop theo quyền. Force-stop cần lý do và dialog. API nhận lệnh có thể đã chặn quyền mới nhưng media vẫn pending: hiển thị Đang ngắt/Chưa xác nhận/Đã ngắt/Lỗi cần thử lại; không báo đã ngắt chỉ vì command được tiếp nhận. Retry cùng command và reconcile không phục hồi phiên terminal.

Khoá quyền live của shop khác khoá toàn gian hàng. Nếu cần khoá shop thì dẫn sang quy trình shop hiện tại, không âm thầm huỷ đơn/voucher/chi trả bằng nút dừng live. Audit actor/time/reason, không public email/IP của người báo cáo.

## 5. Permission và API boundary

- Vendor HTTP dùng actor+ShopContextGuard; shopId lấy từ phiên, không nhận shopId tuỳ ý từ FE. Socket phải có kiểm tương đương và phản ứng khi quyền bị thu hồi.
- Quyền dự kiến: shop.livestream.read/manage/broadcast/moderate/report.read; sàn livestream.session.read/terminate, livestream.report.read/process, livestream.shop.restrict. Đây là tên đề xuất, chưa ghi vào catalog/generated files.
- Màn thiếu quyền đọc hiện403 giữ sidebar; thiếu quyền ghi ẩn nút; BE403 chuyển ApiErrorState. Moderator còn phải được phân công trong phiên.
- Route/page chỉ render features/livestream; REST sinh Orval rồi bọc hook; media SDK/socket ở adapter có lifecycle; không gọi fetch từ component. Query invalidation/event update theo version, không polling studio liên tục.
- UI list/form/client state tuân thủ repo; request command dùng idempotency/version. Không import internals order/product/promotion; bọc query endpoint hoặc dùng shared DTO/component đúng boundary.

## 6. States / Validation

loading/skeleton, rỗng, lỗi retry,403, phiên khác shop404, dirty form, lưu xung đột, start conflict, thiết bị bị từ chối, provider unavailable, reconnect, ended, terminated, report processing. Khởi động thất bại giữ nháp; terminal chỉ đọc; dữ liệu chưa có không fake thành báo cáo thành công.

Bổ sung lỗi camera bị ứng dụng khác chiếm, mất thiết bị, track bị OS cắt, quota provider hết; tách mute chủ động khỏi mất media. Video/chat/API lỗi có chỉ báo và hành động riêng, không reset toàn studio. Room thử/room lỗi phải có TTL/cleanup; không dựng dữ liệu “vừa mua” hoặc viewer giả để trang có vẻ đông.

Voucher campaign dùng policy snapshot FITLY_LIVE_V1 đã chốt; form tạo phiên hiển thị điều kiện nguồn/quantity, slot sàn/shop, nhận khi live, hạn dùng actualStartedAt+24 giờ, quota và quy tắc restore toàn bộ/không restore một phần. Không cho host thay policy/expiry của claim đã cấp. Khoá nhận hoặc thu hồi là hai lệnh khác nhau, có quyền/lý do và audit. Không thay rule voucher thường hay tự hoàn tiền bằng thao tác dừng live.

Panel chi tiết claim cho nhân viên có quyền hiển thị usage/covered quantities, trạng thái refund/restore/recovery và thời điểm/expiry gốc. Shop không có nút tự xác nhận refund done hoặc cấp quota bù; chứng từ thuộc promotion/order/payment. Report đảo doanh thu theo allocation thực hoàn, không trừ mệnh giá voucher như tiền đã trả khách.

Default studio: public60 phút, thử riêng10 phút, startup timeout60 giây, media grace90 giây; mỗi room1publisher, demo1public tối đa10viewer và1phòng thử tối đa2viewer. Đầy quota có thông báo, không tự tăng gói. Sản phẩm tối đa50, phân trang15. Mute/camera-off chủ động không reset thời gian phiên.

390px/desktop: không tràn ngang ngoài table có vùng scroll chủ đích; nút chính luôn thấy; tab có nhãn; focus dialog; keyboard reorder; reduced-motion. Dùng thành phần hiện có trước khi thêm primitive.

## 7. Implementation Steps / Validation — chưa thực hiện

- [x] Khảo sát shell/theme/quyền hiện tại và lập thiết kế xuyên ba repo.
- [x] Mô tả studio, trạng thái, phân quyền, moderation, báo cáo.
- [x] Rà soát lần2: bổ sung phát thử, schedule version, media stop pending, số hàng ổn định, lỗi từng kênh và policy voucher còn mở.
- [x] Chốt UX FITLY, phạm vi A+B và policy V1 theo uỷ quyền; không cần đối chiếu Shopee có đăng nhập.
- [ ] Triển khai theo plan mới được duyệt; hiện chưa viết code.
- [ ] Sinh API/quyền, lint/typecheck/build sau triển khai.
- [ ] Kiểm host/moderator/platform staff không phải admin, shop khác, force-stop/reconnect.
- [ ] Kiểm390px/desktop và LIVE-01–36 của bản tổng/biên bản rà soát.

## 8. Risks / Follow-up

Shopee chỉ là tham khảo, không còn ràng buộc pixel-perfect. Mobile browser không tương đương native background capture; demo dùng tab foreground và kiểm thiết bị thật. Replay/xu/affiliate là backlog ngoài A+B, không dùng ví cọc COD cho xu. Số người xem/quota media phải đo trên cấu hình dùng thật; đây là verification khi triển khai, không phải quyết định nghiệp vụ còn treo.

## 9. Progress / Files Changed

2026-11-06: hoàn tất bản thiết kế Draft; chỉ thêm file docs/plans/PLAN-0008-livestream-ui-design.md. Không sửa mã nguồn/menu/quyền/API, không bật dịch vụ hay tạo dữ liệu demo; chưa chạy build/test vì không có thay đổi ứng dụng.

2026-11-06, rà soát lần2: cập nhật tài liệu này cùng bản tổng/biên bản/plan storefront; không sửa ứng dụng, không chạy runtime. Thiết kế được bổ sung không đồng nghĩa chức năng đã được triển khai hoặc nghiệm thu1:1.

2026-11-06, chốt cuối: hoàn thiện kế hoạch theo FITLY_LIVE_V1 và UX FITLY, A+B đầy đủ trong demo, C backlog. Không còn cổng chờ duyệt policy/reference; chưa bắt đầu code hoặc deploy.
