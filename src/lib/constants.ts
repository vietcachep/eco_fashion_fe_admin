import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  CreditCard,
  LayoutDashboard,
  Megaphone,
  Package,
  Settings,
  ShoppingBag,
  Store,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";
import type { PermissionCode } from "@/lib/permission-codes.generated";

/*
 * Hằng số trung tâm của app.
 * Đường dẫn route CHỈ khai ở đây — không hardcode trong feature/component
 * (AGENTS.md Routing Rule). Tên nhóm route = tên module backend
 * (identity · catalog · product · order · payment · promotion · review · system
 * · reporting · ai) để mở repo nào cũng tìm được mã tương ứng.
 */
export const ROUTES = {
  login: "/login",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  dashboard: "/dashboard",
  changePassword: "/change-password",
  forbidden: "/403",
  identity: {
    users: "/identity/users",
    roles: "/identity/roles",
    auditLogs: "/identity/audit-logs",
    loginHistories: "/identity/login-histories",
  },
  catalog: {
    categories: "/catalog/categories",
    collections: "/catalog/collections",
    attributes: "/catalog/attributes",
    dynamicAttributes: "/catalog/dynamic-attributes",
  },
  product: {
    products: "/product/products",
    productNew: "/product/products/new",
    stock: "/product/inventory/stock",
    receipts: "/product/inventory/receipts",
    receiptNew: "/product/inventory/receipts/new",
  },
  order: {
    orders: "/order/orders",
    returns: "/order/returns",
  },
  payment: {
    payments: "/payment/payments",
    refunds: "/payment/refunds",
    methods: "/payment/methods",
  },
  promotion: {
    promotions: "/promotion/promotions",
    promotionNew: "/promotion/promotions/new",
  },
  review: {
    reviews: "/review/reviews",
  },
  system: {
    settings: "/system/settings",
    provinces: "/system/provinces",
    banners: "/system/banners",
    notifications: "/system/notifications",
    contacts: "/system/contacts",
    faqs: "/system/faqs",
    pages: "/system/pages",
  },
  reporting: {
    revenue: "/reporting/revenue",
    topProducts: "/reporting/top-products",
    inventory: "/reporting/inventory",
  },
  ai: {
    documents: "/ai/documents",
    support: "/ai/support",
    chatSessions: "/ai/chat-sessions",
    moderation: "/ai/moderation",
    insights: "/ai/insights",
    usage: "/ai/usage",
    tools: "/ai/tools",
  },
  /*
   * Module `shop` PHÍA SÀN — nhân viên sàn duyệt/khoá/xem shop bất kỳ (quyền
   * `supplier.*`). Route-group vẫn `(dashboard)` (PLAN-0002 §5).
   */
  shop: {
    shops: "/shop/shops",
    wallets: "/shop/wallets",
    walletDeposits: "/shop/wallet-deposits",
    payouts: "/shop/payouts",
  },
  /*
   * Route-group MỚI, riêng cho nhà cung cấp (chủ/nhân viên shop tự quản gian
   * hàng của mình, quyền `shop.*`) — PLAN-0002 §1/§5. Đặt tên `vendor` (khác
   * `shop` ở trên) để khỏi trùng namespace route với module BE `shop`.
   */
  vendor: {
    dashboard: "/vendor",
    shop: "/vendor/shop",
    shopMembers: "/vendor/shop/members",
    products: "/vendor/products",
    productNew: "/vendor/products/new",
    inventory: "/vendor/inventory",
    inventoryReceipts: "/vendor/inventory/receipts",
    inventoryReceiptNew: "/vendor/inventory/receipts/new",
    orders: "/vendor/orders",
    reports: "/vendor/reports",
    promotions: "/vendor/promotions",
    promotionNew: "/vendor/promotions/new",
    reviews: "/vendor/reviews",
    wallet: "/vendor/wallet",
    payouts: "/vendor/payouts",
  },
} as const;

/*
 * Mã quyền dùng để chặn giao diện — lấy NGUYÊN VĂN từ catalog backend
 * (src/modules/identity/permission/catalog.ts), không tự đặt. `satisfies` ràng
 * mọi giá trị vào PermissionCode (sinh từ catalog) → gõ sai là TypeScript báo
 * đỏ, backend xoá mã là thấy chỗ vỡ. Backend đổi catalog → `npm run perms:sync`.
 */
export const PERMISSIONS = {
  // identity
  userRead: "identity.user.read",
  userCreate: "identity.user.create",
  userUpdate: "identity.user.update",
  userLock: "identity.user.lock",
  roleRead: "identity.role.read",
  roleUpdate: "identity.role.update",
  permissionAssign: "identity.permission.assign",
  auditRead: "identity.audit.read",
  // catalog
  categoryRead: "catalog.category.read",
  categoryManage: "catalog.category.manage",
  attributeManage: "catalog.attribute.manage",
  dynamicAttributeRead: "catalog.dynamic_attribute.read",
  dynamicAttributeManage: "catalog.dynamic_attribute.manage",
  collectionManage: "catalog.collection.manage",
  // product
  productRead: "product.product.read",
  productCreate: "product.product.create",
  productUpdate: "product.product.update",
  productPublish: "product.product.publish",
  productDelete: "product.product.delete",
  inventoryRead: "product.inventory.read",
  inventoryReceive: "product.inventory.receive",
  inventoryAdjust: "product.inventory.adjust",
  // order
  orderRead: "order.order.read",
  orderStatusUpdate: "order.order.status.update",
  orderCancel: "order.order.cancel",
  returnRead: "order.return.read",
  returnProcess: "order.return.process",
  // payment
  paymentRead: "payment.payment.read",
  transferConfirm: "payment.transfer.confirm",
  refundCreate: "payment.refund.create",
  refundProcess: "payment.refund.process",
  methodManage: "payment.method.manage",
  // promotion
  promotionRead: "promotion.promotion.read",
  promotionManage: "promotion.promotion.manage",
  // review
  reviewRead: "review.review.read",
  reviewModerate: "review.review.moderate",
  reviewReply: "review.review.reply",
  // system
  settingRead: "system.setting.read",
  settingUpdate: "system.setting.update",
  bannerManage: "system.banner.manage",
  provinceManage: "system.province.manage",
  notificationSend: "system.notification.send",
  // reporting
  dashboardRead: "reporting.dashboard.read",
  revenueRead: "reporting.revenue.read",
  inventoryReportRead: "reporting.inventory.read",
  // ai
  aiKnowledgeManage: "ai.knowledge.manage",
  aiSupportRead: "ai.support.read",
  aiSupportResolve: "ai.support.resolve",
  aiChatRead: "ai.chat.read",
  aiInsightRead: "ai.insight.read",
  aiCopyCreate: "ai.copy.create",
  aiUsageRead: "ai.usage.read",
  aiModerationRead: "ai.moderation.read",
  // sàn quản lý MỌI gian hàng (supplier.*)
  supplierShopRead: "supplier.shop.read",
  supplierShopApprove: "supplier.shop.approve",
  supplierShopSuspend: "supplier.shop.suspend",
  supplierShopReject: "supplier.shop.reject",
  supplierShopCommission: "supplier.shop.commission",
  supplierWalletRead: "supplier.wallet.read",
  supplierWalletAdjust: "supplier.wallet.adjust",
  supplierPayoutRead: "supplier.payout.read",
  supplierPayoutProcess: "supplier.payout.process",
  // vendor — quyền của vai (shop_owner/shop_staff) trong CHÍNH gian hàng mình; nguồn: GET /shop/session
  shopProfileRead: "shop.profile.read",
  shopProfileUpdate: "shop.profile.update",
  shopProductRead: "shop.product.read",
  shopProductManage: "shop.product.manage",
  shopReviewRead: "shop.review.read",
  shopReviewReply: "shop.review.reply",
  shopStaffRead: "shop.staff.read",
  shopStaffAdd: "shop.staff.invite", // mã quyền giữ tên cũ "invite" (thời còn mời nhân viên); nghĩa hiện tại: thêm nhân viên
  shopStaffUpdate: "shop.staff.update",
  shopStaffRemove: "shop.staff.remove",
  shopOrderRead: "shop.order.read",
  shopOrderUpdate: "shop.order.update",
  shopInventoryRead: "shop.inventory.read",
  shopInventoryManage: "shop.inventory.manage",
  shopPromotionRead: "shop.promotion.read",
  shopPromotionManage: "shop.promotion.manage",
  shopReportRead: "shop.report.read",
  shopWalletRead: "shop.wallet.read",
  shopWalletDepositRequest: "shop.wallet.deposit_request",
  shopPayoutRead: "shop.payout.read",
} as const satisfies Record<string, PermissionCode>;

/*
 * Vai nhân viên (preset backend ROLE_CODES). `customer` KHÔNG được vào khu
 * quản trị — useLogin chặn ngay sau khi đăng nhập.
 */
export const STAFF_ROLES = [
  { code: "admin", name: "Quản trị viên" },
  { code: "manager", name: "Quản lý cửa hàng" },
  { code: "sales", name: "Bán hàng & CSKH" },
  { code: "warehouse", name: "Nhân viên kho" },
  { code: "accountant", name: "Kế toán" },
  { code: "marketing", name: "Marketing" },
] as const;

export const CUSTOMER_ROLE = "customer";

/*
 * Menu sidebar. Mỗi mục là lá (`href`) hoặc cha (`children`). Sidebar lọc quyền
 * ở CẢ HAI cấp (mục cha `permission` + mục con `permission`); cha tự ẩn khi con
 * bị lọc sạch. Không khoá cả nhóm bằng một mã của một màn con — người chỉ có
 * quyền màn khác sẽ mất oan cả nhóm.
 */
export interface NavChild {
  title: string;
  href: string;
  /** Ẩn mục này nếu người dùng thiếu mã quyền. */
  permission?: PermissionCode;
}

export interface NavItem {
  id: string;
  title: string;
  icon: LucideIcon;
  /** Mục lá: link thẳng. */
  href?: string;
  /** Mục cha: mở ra danh sách con. */
  children?: NavChild[];
  /** Ẩn cả mục nếu người dùng thiếu mã quyền. */
  permission?: PermissionCode;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const SIDEBAR_NAV: NavGroup[] = [
  {
    title: "TỔNG QUAN",
    items: [
      {
        id: "dashboard",
        title: "Dashboard",
        href: ROUTES.dashboard,
        icon: LayoutDashboard,
        permission: PERMISSIONS.dashboardRead,
      },
      {
        id: "reporting",
        title: "Báo cáo",
        icon: BarChart3,
        children: [
          {
            title: "Doanh thu",
            href: ROUTES.reporting.revenue,
            permission: PERMISSIONS.revenueRead,
          },
          {
            title: "Sản phẩm bán chạy",
            href: ROUTES.reporting.topProducts,
            permission: PERMISSIONS.revenueRead,
          },
          {
            title: "Tồn kho",
            href: ROUTES.reporting.inventory,
            permission: PERMISSIONS.inventoryReportRead,
          },
        ],
      },
    ],
  },
  {
    title: "BÁN HÀNG",
    items: [
      {
        id: "order",
        title: "Đơn hàng",
        icon: ShoppingBag,
        children: [
          {
            title: "Danh sách đơn",
            href: ROUTES.order.orders,
            permission: PERMISSIONS.orderRead,
          },
          {
            title: "Yêu cầu đổi trả",
            href: ROUTES.order.returns,
            permission: PERMISSIONS.returnRead,
          },
          {
            title: "Đánh giá sản phẩm",
            href: ROUTES.review.reviews,
            permission: PERMISSIONS.reviewRead,
          },
          {
            title: "Liên hệ của khách",
            href: ROUTES.system.contacts,
            permission: PERMISSIONS.notificationSend,
          },
        ],
      },
      {
        id: "payment",
        title: "Thanh toán",
        icon: CreditCard,
        children: [
          {
            title: "Giao dịch",
            href: ROUTES.payment.payments,
            permission: PERMISSIONS.paymentRead,
          },
          {
            title: "Hoàn tiền",
            href: ROUTES.payment.refunds,
            permission: PERMISSIONS.paymentRead,
          },
          {
            title: "Phương thức thanh toán",
            href: ROUTES.payment.methods,
            permission: PERMISSIONS.methodManage,
          },
        ],
      },
    ],
  },
  {
    title: "SẢN PHẨM",
    items: [
      {
        id: "product",
        title: "Sản phẩm",
        icon: Package,
        children: [
          {
            title: "Danh sách sản phẩm",
            href: ROUTES.product.products,
            permission: PERMISSIONS.productRead,
          },
          {
            title: "Ngành hàng",
            href: ROUTES.catalog.categories,
            permission: PERMISSIONS.categoryRead,
          },
          {
            title: "Bộ sưu tập",
            href: ROUTES.catalog.collections,
            permission: PERMISSIONS.collectionManage,
          },
          {
            title: "Thuộc tính (màu / size)",
            href: ROUTES.catalog.attributes,
            permission: PERMISSIONS.attributeManage,
          },
          {
            title: "Thuộc tính động",
            href: ROUTES.catalog.dynamicAttributes,
            permission: PERMISSIONS.dynamicAttributeRead,
          },
        ],
      },
      {
        id: "inventory",
        title: "Kho hàng",
        icon: Warehouse,
        children: [
          {
            title: "Tồn kho",
            href: ROUTES.product.stock,
            permission: PERMISSIONS.inventoryRead,
          },
          {
            title: "Phiếu nhập kho",
            href: ROUTES.product.receipts,
            permission: PERMISSIONS.inventoryRead,
          },
        ],
      },
    ],
  },
  {
    title: "MARKETING",
    items: [
      {
        id: "marketing",
        title: "Marketing",
        icon: Megaphone,
        children: [
          {
            title: "Mã khuyến mãi",
            href: ROUTES.promotion.promotions,
            permission: PERMISSIONS.promotionRead,
          },
          {
            title: "Banner trang chủ",
            href: ROUTES.system.banners,
            permission: PERMISSIONS.bannerManage,
          },
          {
            title: "Gửi thông báo",
            href: ROUTES.system.notifications,
            permission: PERMISSIONS.notificationSend,
          },
        ],
      },
      {
        id: "ai",
        title: "Trợ lý AI",
        icon: Bot,
        children: [
          {
            title: "Kho tri thức chatbot",
            href: ROUTES.ai.documents,
            permission: PERMISSIONS.aiKnowledgeManage,
          },
          {
            title: "Yêu cầu hỗ trợ",
            href: ROUTES.ai.support,
            permission: PERMISSIONS.aiSupportRead,
          },
          {
            title: "Hội thoại chatbot",
            href: ROUTES.ai.chatSessions,
            permission: PERMISSIONS.aiChatRead,
          },
          {
            title: "Kiểm duyệt AI",
            href: ROUTES.ai.moderation,
            permission: PERMISSIONS.aiModerationRead,
          },
          {
            title: "Nhận xét vận hành",
            href: ROUTES.ai.insights,
            permission: PERMISSIONS.aiInsightRead,
          },
          {
            title: "Công cụ soạn nội dung",
            href: ROUTES.ai.tools,
            permission: PERMISSIONS.aiCopyCreate,
          },
          {
            title: "Chi phí & hạn mức",
            href: ROUTES.ai.usage,
            permission: PERMISSIONS.aiUsageRead,
          },
        ],
      },
    ],
  },
  {
    /* Sàn quản lý gian hàng nhà cung cấp (module BE `shop` + payment: ví quỹ COD, đối soát) — mã quyền `supplier.*`. */
    title: "SÀN — GIAN HÀNG",
    items: [
      {
        id: "shop-marketplace",
        title: "Gian hàng",
        icon: Store,
        children: [
          {
            title: "Danh sách shop",
            href: ROUTES.shop.shops,
            permission: PERMISSIONS.supplierShopRead,
          },
          {
            title: "Ví quỹ COD",
            href: ROUTES.shop.wallets,
            permission: PERMISSIONS.supplierWalletRead,
          },
          {
            title: "Yêu cầu nộp quỹ",
            href: ROUTES.shop.walletDeposits,
            permission: PERMISSIONS.supplierWalletRead,
          },
          {
            title: "Đối soát (payout)",
            href: ROUTES.shop.payouts,
            permission: PERMISSIONS.supplierPayoutRead,
          },
        ],
      },
    ],
  },
  {
    title: "HỆ THỐNG",
    items: [
      {
        id: "identity",
        title: "Người dùng",
        icon: Users,
        children: [
          {
            title: "Nhân viên & khách hàng",
            href: ROUTES.identity.users,
            permission: PERMISSIONS.userRead,
          },
          {
            title: "Vai trò & quyền",
            href: ROUTES.identity.roles,
            permission: PERMISSIONS.roleRead,
          },
          {
            title: "Nhật ký thao tác",
            href: ROUTES.identity.auditLogs,
            permission: PERMISSIONS.auditRead,
          },
          {
            title: "Lịch sử đăng nhập",
            href: ROUTES.identity.loginHistories,
            permission: PERMISSIONS.auditRead,
          },
        ],
      },
      {
        id: "catalog-settings",
        title: "Cấu hình cửa hàng",
        icon: Settings,
        children: [
          {
            title: "Tham số vận hành",
            href: ROUTES.system.settings,
            permission: PERMISSIONS.settingRead,
          },
          {
            title: "Tỉnh/thành & phí ship",
            href: ROUTES.system.provinces,
            permission: PERMISSIONS.provinceManage,
          },
          {
            title: "Câu hỏi thường gặp",
            href: ROUTES.system.faqs,
            permission: PERMISSIONS.settingRead,
          },
          {
            title: "Trang tĩnh",
            href: ROUTES.system.pages,
            permission: PERMISSIONS.settingRead,
          },
        ],
      },
    ],
  },
];

/*
 * Menu sidebar RIÊNG cho scope vendor (route-group `(vendor)`, PLAN-0002 §5) — song song `SIDEBAR_NAV` (scope "platform").
 * `RoleGuard` chặn cả scope ở cửa vào (phải là thành viên gian hàng đã duyệt); phân quyền CHI TIẾT theo vai trong shop
 * (chủ shop / nhân viên) lọc ở đây + `PermissionGuard`/`PermissionGate` từng màn. Mã `shop.*` lấy từ `GET /shop/session`
 * (gộp vào `permissionCodes` của hồ sơ người dùng — xem features/identity/api/auth-api.ts getCurrentUser).
 */
export const VENDOR_NAV: NavGroup[] = [
  {
    title: "TỔNG QUAN",
    items: [
      {
        id: "vendor-dashboard",
        title: "Dashboard",
        href: ROUTES.vendor.dashboard,
        icon: LayoutDashboard,
        permission: PERMISSIONS.shopReportRead,
      },
      {
        id: "vendor-report",
        title: "Báo cáo doanh thu",
        href: ROUTES.vendor.reports,
        icon: BarChart3,
        permission: PERMISSIONS.shopReportRead,
      },
    ],
  },
  {
    title: "GIAN HÀNG CỦA TÔI",
    items: [
      {
        id: "vendor-shop",
        title: "Gian hàng",
        icon: Store,
        children: [
          { title: "Hồ sơ & tài khoản ngân hàng", href: ROUTES.vendor.shop, permission: PERMISSIONS.shopProfileRead },
          { title: "Nhân viên shop", href: ROUTES.vendor.shopMembers, permission: PERMISSIONS.shopStaffRead },
        ],
      },
      {
        id: "vendor-product",
        title: "Sản phẩm",
        icon: Package,
        href: ROUTES.vendor.products,
        permission: PERMISSIONS.shopProductRead,
      },
      {
        id: "vendor-inventory",
        title: "Kho hàng",
        icon: Warehouse,
        children: [
          { title: "Tồn kho", href: ROUTES.vendor.inventory, permission: PERMISSIONS.shopInventoryRead },
          { title: "Phiếu nhập kho", href: ROUTES.vendor.inventoryReceipts, permission: PERMISSIONS.shopInventoryRead },
        ],
      },
      {
        id: "vendor-order",
        title: "Đơn hàng",
        icon: ShoppingBag,
        href: ROUTES.vendor.orders,
        permission: PERMISSIONS.shopOrderRead,
      },
    ],
  },
  {
    title: "MARKETING & DỊCH VỤ",
    items: [
      {
        id: "vendor-promotion",
        title: "Mã khuyến mãi",
        icon: Megaphone,
        href: ROUTES.vendor.promotions,
        permission: PERMISSIONS.shopPromotionRead,
      },
      {
        id: "vendor-review",
        title: "Đánh giá sản phẩm",
        icon: Users,
        href: ROUTES.vendor.reviews,
        permission: PERMISSIONS.shopReviewRead,
      },
    ],
  },
  {
    title: "TÀI CHÍNH",
    items: [
      {
        id: "vendor-finance",
        title: "Tài chính",
        icon: Wallet,
        children: [
          { title: "Ví quỹ COD", href: ROUTES.vendor.wallet, permission: PERMISSIONS.shopWalletRead },
          { title: "Đối soát (payout)", href: ROUTES.vendor.payouts, permission: PERMISSIONS.shopPayoutRead },
        ],
      },
    ],
  },
];

/*
 * Màn đầu tiên người dùng ĐƯỢC vào theo thứ tự sidebar — dùng sau đăng nhập.
 * Nhân viên kho không có reporting.dashboard.read mà bị đưa về /dashboard sẽ
 * gặp 403 ngay câu đầu tiên; đưa họ tới màn có quyền (Tồn kho) thì hợp lý hơn.
 *
 * `scope` chọn cây menu để dò ("platform" mặc định — giữ nguyên hành vi cũ
 * cho mọi lời gọi hiện có); "vendor" dò trong `VENDOR_NAV` (không mục nào
 * khai `permission` theo vai trong shop — dò như menu sàn).
 */
/*
 * Khu vực vào sau đăng nhập. Người CHỈ có quyền `shop.*` (chủ/nhân viên gian hàng, vai khách của sàn) vào thẳng /vendor; nhân viên sàn có
 * quyền ngoài `shop.*` vào khu sàn dù kiêm một gian hàng (vd quản trị sàn là chủ FITLY Official) — tránh đưa quản trị sàn vào cổng vendor.
 */
export function landingScope(permissionCodes: readonly string[], hasActiveShop: boolean): "platform" | "vendor" {
  const hasPlatformAccess = permissionCodes.some((c) => !c.startsWith("shop."));
  return hasActiveShop && !hasPlatformAccess ? "vendor" : "platform";
}

export function firstAllowedRoute(
  permissionCodes: readonly string[],
  scope: "platform" | "vendor" = "platform",
): string {
  const has = (code?: PermissionCode) => !code || permissionCodes.includes(code);
  const nav = scope === "vendor" ? VENDOR_NAV : SIDEBAR_NAV;
  for (const group of nav) {
    for (const item of group.items) {
      if (!has(item.permission)) continue;
      if (item.href) return item.href;
      const child = item.children?.find((c) => has(c.permission));
      if (child) return child.href;
    }
  }
  return scope === "vendor" ? ROUTES.vendor.dashboard : ROUTES.dashboard;
}
