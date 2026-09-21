# FITLY Admin — fashion_frontend_admin

> Web quản trị cửa hàng thời trang **FITLY** (EcoFashion): sản phẩm & tồn kho, đơn hàng & đổi trả,
> thanh toán VNPay / chuyển khoản / COD, khuyến mãi, đánh giá, báo cáo, trợ lý AI — cho từng vai nhân viên.
> Next.js App Router, feature-first, API qua **Orval codegen**. Luật code: `AGENTS.md`. Plan: `docs/plans/`.

## 1. Bối cảnh

| Repo | Vai trò |
|---|---|
| `eco_backend` | NestJS 12 + Prisma 7, 11 module, Swagger `/docs`, `EF_*` env — nguồn sự thật của API và mã quyền |
| `fashion_frontend_user` | Web bán hàng cho khách (Vineta/Bootstrap) |
| **`fashion_frontend_admin`** (repo này) | Web quản trị cho nhân viên, cổng 3001 |

## 2. Công nghệ

Next.js 16 · React 19 · TypeScript strict · Tailwind 4 · shadcn/ui (base-nova) · TanStack Query/Table ·
Axios · Orval · Zustand · React Hook Form + Zod · recharts · sonner · lucide.

## 3. Chạy dự án

```powershell
# 1. Backend chạy trước (thư mục eco_backend): docker compose up -d --build  → http://localhost:4000
# 2. Frontend
Copy-Item .env.example .env.local     # mặc định trỏ backend localhost:4000
npm ci
npm run dev                            # http://localhost:3001
```

Tài khoản seed của backend: admin `admin@ecofashion.vn` / `Admin123456!`; nhân viên `manager@` · `sales@` ·
`warehouse@` · `accountant@` · `marketing@ecofashion.vn` / `NhanVien123!`. Tài khoản khách (`khachN@`)
không vào được khu quản trị.

### Codegen khi backend đổi

```powershell
npm run api:sync      # tải /docs/openapi.json (backend đang chạy) → openapi/api-docs.json → src/lib/api/generated
npm run perms:sync    # chép catalog quyền backend → openapi/permissions.json → src/lib/permission-codes.generated.ts
```

Cả `openapi/*.json` lẫn file sinh đều commit (CI không có backend). `BACKEND_REPO` / `API_SPEC_URL` trong
`.env.local` khi backend ở chỗ khác.

### Kiểm tra

```powershell
npm run verify        # lint + typecheck + build (Done Definition)
```

## 4. Cấu trúc

```text
fashion_frontend_admin
├── AGENTS.md · PLANS.md · docs/            luật code, luật plan, kiến trúc, bản đồ màn hình
├── openapi/                                api-docs.json (Orval input) · permissions.json (catalog quyền)
├── scripts/                                fetch-openapi · sync-permissions · gen-permission-codes
├── orval.config.ts                         codegen → src/lib/api/generated (KHÔNG sửa tay)
└── src/
    ├── app/                                (auth): login · forgot/reset-password  ·  (dashboard): shell + 40 màn
    ├── features/<module>/                  identity · catalog · product · order · payment · promotion · review · system · reporting · ai
    ├── components/ui | layout | shared     shadcn · sidebar/header/guards · data-table, filter-tabs, stat-card…
    ├── lib/                                api.ts (axios + refresh) · api/mutator.ts (bóc envelope) · constants (ROUTES, PERMISSIONS, SIDEBAR_NAV) · labels · format
    ├── stores/ hooks/ providers/ types/
    └── lib/permission-codes.generated.ts   52 mã quyền (sinh)
```

## 5. Màn hình (theo module backend)

| Module | Route | Nội dung | Quyền vào màn |
|---|---|---|---|
| reporting | `/dashboard` | Hôm nay / tháng, việc đang chờ, 7 ngày, top SP, trạng thái đơn | `reporting.dashboard.read` |
| reporting | `/reporting/revenue` · `top-products` · `inventory` | Doanh thu theo kỳ + tính lại, bán chạy, tồn kho & sắp hết | `reporting.revenue.read` / `reporting.inventory.read` |
| order | `/order/orders`, `/order/orders/[code]` | Danh sách + chi tiết, chuyển trạng thái theo lưới, huỷ | `order.order.read` |
| order | `/order/returns`, `/order/returns/[id]` | Yêu cầu đổi trả, duyệt / từ chối | `order.return.read` |
| review | `/review/reviews` | Ẩn / hiện, trả lời (AI soạn nháp) | `review.review.read` |
| payment | `/payment/payments` · `refunds` · `methods` | Đối soát chuyển khoản, hoàn tiền, bật/tắt phương thức | `payment.payment.read` / `payment.method.manage` |
| product | `/product/products`, `/new`, `/[id]` | Danh sách, form, biến thể màu × size, ảnh, đăng bán / ẩn / xoá, AI kiểm listing | `product.product.read` |
| product | `/product/inventory/stock` · `receipts` · `receipts/new` · `receipts/[id]` | Tồn kho + sổ kho + điều chỉnh, phiếu nhập nháp → ghi sổ | `product.inventory.read` |
| catalog | `/catalog/categories` · `collections` · `attributes` | Cây ngành hàng + ảnh, bộ sưu tập, giá trị màu/size/chất liệu | `catalog.category.read` / `collection.manage` / `attribute.manage` |
| promotion | `/promotion/promotions`, `/new`, `/[id]` | Mã %, số tiền, freeship; lượt dùng theo đơn | `promotion.promotion.read` |
| system | `/system/banners` · `notifications` · `contacts` · `settings` · `provinces` · `faqs` · `pages` | Banner, gửi thông báo, trả lời liên hệ, tham số, phí ship, FAQ, trang tĩnh | `system.*` |
| ai | `/ai/documents` · `support` · `chat-sessions` · `moderation` · `insights` · `tools` · `usage` | Kho tri thức RAG, yêu cầu hỗ trợ, hội thoại + "bot bí", nhãn kiểm duyệt, nhận xét vận hành + hỏi số liệu, soạn nội dung, chi phí | `ai.*` |
| identity | `/identity/users`, `/[id]`, `roles`, `audit-logs`, `login-histories` | Nhân viên/khách, khoá, đặt lại MK, quyền riêng, bộ quyền vai, nhật ký | `identity.*` |

## 6. Quy ước

- Mọi lời gọi qua `src/lib/api.ts` (proxy same-origin `/api/*` → `BACKEND_URL`); envelope `ApiResponse` bóc ở mutator.
- Access token trong RAM, refresh token localStorage (`fitly-admin-auth`), xoay vòng; 401 → refresh một lần rồi gọi lại.
- 3 lớp chặn quyền (guard màn · gate nút · 403 từ API). Mã quyền là type sinh từ catalog backend.
- Tiền: hiện `Money.display` từ backend; nhập số VND → gửi chuỗi số nguyên.

## 7. Trạng thái

| Plan | Nội dung | Trạng thái |
|---|---|---|
| PLAN-0001 | Khung dự án + Orval + auth + shell + toàn bộ 40 màn quản trị theo 11 module backend | ✅ 2026-09-15 |
