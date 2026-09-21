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
  Users,
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
 * Màn đầu tiên người dùng ĐƯỢC vào theo thứ tự sidebar — dùng sau đăng nhập.
 * Nhân viên kho không có reporting.dashboard.read mà bị đưa về /dashboard sẽ
 * gặp 403 ngay câu đầu tiên; đưa họ tới màn có quyền (Tồn kho) thì hợp lý hơn.
 */
export function firstAllowedRoute(permissionCodes: readonly string[]): string {
  const has = (code?: PermissionCode) => !code || permissionCodes.includes(code);
  for (const group of SIDEBAR_NAV) {
    for (const item of group.items) {
      if (!has(item.permission)) continue;
      if (item.href) return item.href;
      const child = item.children?.find((c) => has(c.permission));
      if (child) return child.href;
    }
  }
  return ROUTES.dashboard;
}
