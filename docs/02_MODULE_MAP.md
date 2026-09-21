# 02 — Bản đồ module ↔ màn hình ↔ API

| Feature | Sub-domain (components/) | Route | Endpoint chính (tag Orval) | Quyền |
|---|---|---|---|---|
| identity | auth · profile | `/login` `/forgot-password` `/reset-password` `/change-password` | `auth`: login · refresh · logout · me · forgot/reset/change-password; `users`: me · avatar | — |
| identity | users | `/identity/users` `/identity/users/[id]` | `admin-users`: list · get · createStaff · update · setStatus · resetPassword; `admin-roles`: userOverrides · save | `identity.user.*`, `identity.permission.assign` |
| identity | roles · shared/permission-tree-editor | `/identity/roles` | `admin-roles`: list · rolePermissions · replace · permissions | `identity.role.*` |
| identity | audit | `/identity/audit-logs` `/identity/login-histories` | `admin-audit`: list · loginHistories | `identity.audit.read` |
| catalog | categories · collections · attributes | `/catalog/*` | `admin-catalog`: category/collection CRUD + image; `catalog`: attributes list · saveValue · deleteValue | `catalog.*` |
| product | products | `/product/products` `/new` `/[id]` | `admin-products`: list · get · create · update · remove · variants · publish · hide · images upload/update/remove/reorder; `admin-ai`: precheck | `product.product.*`, `ai.copy.create` |
| product | inventory | `/product/inventory/stock` `/receipts` `/receipts/new` `/receipts/[id]` | `admin-inventory`: stock · movements · receipts · createReceipt · receipt · postReceipt (Idempotency-Key) · adjust | `product.inventory.*` |
| order | orders · returns | `/order/orders` `/[code]` `/order/returns` `/[id]` | `admin-orders`: list · get · status · cancel · returnsList · returnGet · returnProcess | `order.*` |
| payment | payments · refunds · methods | `/payment/payments` `/refunds` `/methods` | `admin-payments`: list · get · confirm · refunds · process · methods · setMethod | `payment.*` |
| promotion | promotions | `/promotion/promotions` `/new` `/[id]` | `admin-promotions`: list · get · create · update · remove · usages | `promotion.*` |
| review | reviews | `/review/reviews` | `admin-reviews`: list · moderate · reply; `admin-ai`: copy(review_reply) | `review.*` |
| system | settings · provinces · banners · notifications · contacts · faqs · pages | `/system/*` | `admin-system`: settingsList/Update · provinces · banners (api tay multipart) · broadcast · contacts · reply · faqs · pages | `system.*` |
| reporting | dashboard · revenue · top-products · inventory · shared/date-range-picker | `/dashboard` `/reporting/*` | `admin-reports`: dashboard · revenue · top · lowStock · inventory · recompute | `reporting.*` |
| ai | documents · support · chat-sessions · moderation · insights · tools · usage | `/ai/*` | `admin-ai`: documents CRUD/reindex/indexStatus/rebuild · support · draftReply · chatSessions · chatInsights · flags · moderateNow · summarizeNow · copy · classify · inventoryInsights · revenueInsight · combos · ask · usage · recStats | `ai.*` |

Endpoint backend CHƯA có màn (chủ đích — thuộc web bán hàng hoặc chưa cần): `cart`, `wishlist`, `orders` (khách),
`payments/vnpay/*`, `ai/chat`, `ai/try-on`, `ai/style-analysis`, `notifications` (của tôi), `users/me/addresses`,
`uploads/media` (admin upload ảnh đi endpoint riêng của từng resource).
