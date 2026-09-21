import type {
  DailyPoint,
  DashboardResponse,
  InventorySummary,
  RevenueResponse,
  TopProductRow,
} from "@/features/reporting/types/reporting";
import type { Money, PageResponse } from "@/types/common";
import type { ProductListItem } from "@/features/product/types/product";
import type { OrderSummaryResponse } from "@/features/order/types/order";

/* =====================================================================
 * MOCK DATA CHO FITLY ADMIN
 * Giai đoạn: Luồng đăng nhập & phân quyền nối API thật; các màn hình
 * quản trị khác sử dụng dữ liệu mẫu trực quan, chuẩn DTO.
 * ===================================================================== */

function tien(amount: number): Money {
  return {
    amount: String(amount),
    display: `${amount.toLocaleString("vi-VN")} ₫`,
    currency: "VND",
    symbol: "₫",
  };
}

const dp = (day: string, revenue: number, orderCount: number): DailyPoint => ({
  day,
  orderCount,
  paidCount: orderCount - 1,
  cancelledCount: 1,
  revenue: tien(revenue),
  discount: tien(Math.round(revenue * 0.05)),
  shippingFee: tien(orderCount * 30000),
  itemsSold: orderCount * 2,
  newCustomers: Math.round(orderCount * 0.7),
  refunded: tien(0),
});

// --- 1. REPORTING / DASHBOARD ---
export const MOCK_TOP_PRODUCTS: TopProductRow[] = [
  { productId: "p1", slug: "ao-thun-compact", name: "Áo Thun Cổ Tròn Cotton Compact FITLY", imageUrl: null, quantity: 142, revenue: tien(35500000), orderCount: 95 },
  { productId: "p2", slug: "quan-jean-slim", name: "Quần Jean Slimfit Co Giãn 4 Chiều", imageUrl: null, quantity: 98, revenue: tien(44100000), orderCount: 72 },
  { productId: "p3", slug: "ao-so-mi-oxford", name: "Áo Sơ Mi Oxford Dài Tay Chống Nhăn", imageUrl: null, quantity: 85, revenue: tien(34000000), orderCount: 65 },
  { productId: "p4", slug: "dam-vay-chu-a", name: "Đầm Váy Chữ A Công Sở Thanh Lịch", imageUrl: null, quantity: 76, revenue: tien(38000000), orderCount: 58 },
  { productId: "p5", slug: "ao-khoac-blazer", name: "Áo Khoác Blazer Nam/Nữ Oversize", imageUrl: null, quantity: 52, revenue: tien(33800000), orderCount: 42 },
];

export const MOCK_DASHBOARD: DashboardResponse = {
  today: dp("2026-09-21", 35600000, 52),
  month: {
    revenue: tien(285400000),
    orderCount: 412,
    paidCount: 395,
    itemsSold: 840,
    newCustomers: 215,
    refunded: tien(1250000),
  },
  pending: {
    awaitingConfirm: 12,
    awaitingPayment: 18,
    packing: 8,
    shipping: 25,
    returnsRequested: 2,
    transfersToConfirm: 5,
    refundsRequested: 1,
    contactsNew: 3,
    supportOpen: 4,
    lowStock: 5,
  },
  last7Days: [
    dp("2026-09-15", 18500000, 24),
    dp("2026-09-16", 22100000, 31),
    dp("2026-09-17", 19800000, 28),
    dp("2026-09-18", 26400000, 38),
    dp("2026-09-19", 31200000, 45),
    dp("2026-09-20", 29500000, 42),
    dp("2026-09-21", 35600000, 52),
  ],
  topProducts: MOCK_TOP_PRODUCTS,
  orderStatus: [
    { status: "pending", count: 12 },
    { status: "confirmed", count: 18 },
    { status: "shipping", count: 25 },
    { status: "delivered", count: 345 },
    { status: "cancelled", count: 12 },
  ],
  paymentMethods: [
    { method: "VNPAY", count: 240, revenue: tien(175000000) },
    { method: "BANK_TRANSFER", count: 110, revenue: tien(78000000) },
    { method: "COD", count: 62, revenue: tien(32400000) },
  ],
  generatedAt: new Date().toISOString(),
};

export const MOCK_REVENUE_REPORT: RevenueResponse = {
  from: "2026-09-15",
  to: "2026-09-21",
  granularity: "day",
  points: [
    { period: "2026-09-15", revenue: tien(18500000), orderCount: 24, paidCount: 23, cancelledCount: 1, itemsSold: 48, discount: tien(900000), refunded: tien(0) },
    { period: "2026-09-16", revenue: tien(22100000), orderCount: 31, paidCount: 30, cancelledCount: 1, itemsSold: 62, discount: tien(1100000), refunded: tien(0) },
    { period: "2026-09-17", revenue: tien(19800000), orderCount: 28, paidCount: 27, cancelledCount: 1, itemsSold: 56, discount: tien(950000), refunded: tien(0) },
    { period: "2026-09-18", revenue: tien(26400000), orderCount: 38, paidCount: 36, cancelledCount: 2, itemsSold: 76, discount: tien(1300000), refunded: tien(0) },
    { period: "2026-09-19", revenue: tien(31200000), orderCount: 45, paidCount: 43, cancelledCount: 2, itemsSold: 90, discount: tien(1500000), refunded: tien(0) },
    { period: "2026-09-20", revenue: tien(29500000), orderCount: 42, paidCount: 40, cancelledCount: 2, itemsSold: 84, discount: tien(1450000), refunded: tien(0) },
    { period: "2026-09-21", revenue: tien(35600000), orderCount: 52, paidCount: 50, cancelledCount: 2, itemsSold: 104, discount: tien(1750000), refunded: tien(0) },
  ],
  total: {
    revenue: tien(183100000),
    orderCount: 260,
    paidCount: 249,
    cancelledCount: 11,
    itemsSold: 520,
    discount: tien(8950000),
    refunded: tien(0),
  },
};

export const MOCK_INVENTORY_REPORT: InventorySummary = {
  products: 86,
  variants: 240,
  unitsInStock: 3420,
  unitsReserved: 48,
  stockValue: tien(855000000),
  lowStock: 5,
  outOfStock: 2,
};

// --- 2. PRODUCTS & INVENTORY ---
export const MOCK_PRODUCTS: PageResponse<ProductListItem> = {
  content: [
    {
      id: "prod-1",
      name: "Áo Thun Basic Cotton Compact FITLY",
      slug: "ao-thun-basic-cotton-compact",
      categorySlug: "ao-nam",
      gender: "nam",
      price: tien(250000),
      listPrice: tien(320000),
      colors: [{ code: "white", name: "Trắng", hex: "#FFFFFF" }, { code: "black", name: "Đen", hex: "#000000" }],
      sizes: ["S", "M", "L", "XL"],
      avgRating: 4.8,
      reviewCount: 36,
      soldCount: 142,
      isNew: true,
      inStock: true,
      status: "active",
    },
    {
      id: "prod-2",
      name: "Quần Jean Slimfit Co Giãn 4 Chiều",
      slug: "quan-jean-slimfit-co-gian",
      categorySlug: "quan-nam",
      gender: "nam",
      price: tien(450000),
      listPrice: tien(550000),
      colors: [{ code: "dark-blue", name: "Xanh đậm", hex: "#1A2B4C" }],
      sizes: ["29", "30", "31", "32"],
      avgRating: 4.9,
      reviewCount: 28,
      soldCount: 98,
      isNew: false,
      inStock: true,
      status: "active",
    },
    {
      id: "prod-3",
      name: "Áo Sơ Mi Oxford Dài Tay Chống Nhăn",
      slug: "ao-so-mi-oxford-dai-tay",
      categorySlug: "ao-nam",
      gender: "nam",
      price: tien(390000),
      listPrice: tien(480000),
      colors: [{ code: "white", name: "Trắng", hex: "#FFFFFF" }, { code: "light-blue", name: "Xanh nhạt", hex: "#C5D3E8" }],
      sizes: ["M", "L", "XL"],
      avgRating: 4.7,
      reviewCount: 22,
      soldCount: 85,
      isNew: true,
      inStock: true,
      status: "active",
    },
    {
      id: "prod-4",
      name: "Đầm Váy Chữ A Công Sở Thanh Lịch",
      slug: "dam-vay-chu-a-cong-so",
      categorySlug: "dam-vay",
      gender: "nu",
      price: tien(490000),
      listPrice: tien(620000),
      colors: [{ code: "beige", name: "Be", hex: "#E8D8C8" }, { code: "black", name: "Đen", hex: "#000000" }],
      sizes: ["S", "M", "L"],
      avgRating: 4.9,
      reviewCount: 45,
      soldCount: 76,
      isNew: false,
      inStock: true,
      status: "active",
    },
    {
      id: "prod-5",
      name: "Áo Khoác Blazer Unisex Oversize",
      slug: "ao-khoac-blazer-unisex",
      categorySlug: "ao-khoac",
      gender: "unisex",
      price: tien(650000),
      listPrice: tien(790000),
      colors: [{ code: "grey", name: "Xám", hex: "#808080" }, { code: "black", name: "Đen", hex: "#000000" }],
      sizes: ["M", "L"],
      avgRating: 4.8,
      reviewCount: 19,
      soldCount: 52,
      isNew: true,
      inStock: true,
      status: "active",
    },
    {
      id: "prod-6",
      name: "Quần Short Kaki Co Giãn Thoải Mái",
      slug: "quan-short-kaki-co-gian",
      categorySlug: "quan-nam",
      gender: "nam",
      price: tien(220000),
      listPrice: tien(290000),
      colors: [{ code: "beige", name: "Be", hex: "#D4C3A3" }, { code: "black", name: "Đen", hex: "#000000" }],
      sizes: ["29", "30", "31", "32"],
      avgRating: 4.6,
      reviewCount: 15,
      soldCount: 90,
      isNew: false,
      inStock: true,
      status: "active",
    },
  ],
  page: 1,
  size: 20,
  totalElements: 6,
  totalPages: 1,
  first: true,
  last: true,
};

export const MOCK_STOCK = {
  content: [
    { id: "stk-1", productName: "Áo Thun Basic Cotton Compact", variantName: "Trắng / M", sku: "AT-W-M", stock: 35, reserved: 2, available: 33, reorderPoint: 10 },
    { id: "stk-2", productName: "Áo Thun Basic Cotton Compact", variantName: "Đen / L", sku: "AT-B-L", stock: 40, reserved: 1, available: 39, reorderPoint: 10 },
    { id: "stk-3", productName: "Quần Jean Slimfit Co Giãn", variantName: "Xanh Đậm / 30", sku: "QJ-DB-30", stock: 25, reserved: 3, available: 22, reorderPoint: 8 },
    { id: "stk-4", productName: "Áo Sơ Mi Oxford Dài Tay", variantName: "Trắng / L", sku: "SM-W-L", stock: 18, reserved: 0, available: 18, reorderPoint: 5 },
    { id: "stk-5", productName: "Đầm Váy Chữ A Công Sở", variantName: "Be / S", sku: "DV-BE-S", stock: 15, reserved: 1, available: 14, reorderPoint: 5 },
  ],
  page: 1,
  size: 20,
  totalElements: 5,
  totalPages: 1,
  first: true,
  last: true,
};

export const MOCK_RECEIPTS = {
  content: [
    { id: "rcp-1", code: "NK-2026-001", supplier: "Xưởng Dệt May Hòa Phát", totalItems: 250, totalCost: 35000000, status: "completed", createdAt: "2026-09-18T10:00:00Z" },
    { id: "rcp-2", code: "NK-2026-002", supplier: "Công ty Cổ phần May Việt Tiến", totalItems: 180, totalCost: 28500000, status: "completed", createdAt: "2026-09-19T14:30:00Z" },
  ],
  page: 1,
  size: 20,
  totalElements: 2,
  totalPages: 1,
  first: true,
  last: true,
};

// --- 3. ORDERS & RETURNS ---
export const MOCK_ORDERS: PageResponse<OrderSummaryResponse> = {
  content: [
    {
      code: "ORD-2026-001",
      status: "shipping",
      statusLabel: "Đang giao",
      paymentMethodCode: "VNPAY",
      paymentStatus: "PAID",
      itemCount: 2,
      total: tien(750000),
      firstItemName: "Áo Thun Basic Cotton Compact",
      firstItemImage: null,
      recipientName: "Nguyễn Văn An",
      createdAt: "2026-09-21T10:15:00Z",
    },
    {
      code: "ORD-2026-002",
      status: "confirmed",
      statusLabel: "Đã xác nhận",
      paymentMethodCode: "BANK_TRANSFER",
      paymentStatus: "PAID",
      itemCount: 3,
      total: tien(1250000),
      firstItemName: "Quần Jean Slimfit Co Giãn",
      firstItemImage: null,
      recipientName: "Trần Thị Mai",
      createdAt: "2026-09-21T09:30:00Z",
    },
    {
      code: "ORD-2026-003",
      status: "delivered",
      statusLabel: "Đã giao",
      paymentMethodCode: "COD",
      paymentStatus: "PAID",
      itemCount: 1,
      total: tien(490000),
      firstItemName: "Áo Sơ Mi Oxford Dài Tay",
      firstItemImage: null,
      recipientName: "Lê Hoàng Phúc",
      createdAt: "2026-09-21T08:45:00Z",
    },
    {
      code: "ORD-2026-004",
      status: "pending",
      statusLabel: "Chờ xác nhận",
      paymentMethodCode: "COD",
      paymentStatus: "PENDING",
      itemCount: 2,
      total: tien(890000),
      firstItemName: "Đầm Váy Chữ A Công Sở",
      firstItemImage: null,
      recipientName: "Phạm Thúy Hằng",
      createdAt: "2026-09-21T08:10:00Z",
    },
    {
      code: "ORD-2026-005",
      status: "delivered",
      statusLabel: "Đã giao",
      paymentMethodCode: "VNPAY",
      paymentStatus: "PAID",
      itemCount: 4,
      total: tien(1650000),
      firstItemName: "Áo Khoác Blazer Unisex",
      firstItemImage: null,
      recipientName: "Đỗ Quốc Bảo",
      createdAt: "2026-09-20T19:20:00Z",
    },
  ],
  page: 1,
  size: 20,
  totalElements: 5,
  totalPages: 1,
  first: true,
  last: true,
};

export const MOCK_RETURNS = {
  content: [
    { id: "ret-1", code: "RET-2026-001", orderCode: "ORD-2026-003", customerName: "Lê Hoàng Phúc", reason: "Khách thử không vừa size, muốn đổi size L", status: "PENDING", createdAt: "2026-09-21T11:00:00Z" },
  ],
  page: 1,
  size: 20,
  totalElements: 1,
  totalPages: 1,
  first: true,
  last: true,
};

// --- 4. CATALOG ---
export const MOCK_CATEGORIES = [
  { id: "cat-1", name: "Áo nam", slug: "ao-nam", level: 1, isActive: true, children: [] },
  { id: "cat-2", name: "Quần nam", slug: "quan-nam", level: 1, isActive: true, children: [] },
  { id: "cat-3", name: "Áo nữ", slug: "ao-nu", level: 1, isActive: true, children: [] },
  { id: "cat-4", name: "Chân váy & Đầm", slug: "dam-vay", level: 1, isActive: true, children: [] },
  { id: "cat-5", name: "Áo khoác", slug: "ao-khoac", level: 1, isActive: true, children: [] },
];

export const MOCK_COLLECTIONS = [
  { id: "col-1", name: "Bộ sưu tập Mùa Hè 2026", slug: "mua-he-2026", isActive: true, productsCount: 24 },
  { id: "col-2", name: "Thời Trang Công Sở Tối Giản", slug: "cong-so-toi-gian", isActive: true, productsCount: 18 },
  { id: "col-3", name: "Đồ Đôi FITLY Romantic", slug: "do-doi-romantic", isActive: true, productsCount: 12 },
];

export const MOCK_ATTRIBUTES = [
  { id: "att-1", name: "Kích cỡ", code: "size", values: ["S", "M", "L", "XL", "2XL"] },
  { id: "att-2", name: "Màu sắc", code: "color", values: ["Trắng", "Đen", "Xanh navy", "Be", "Xám"] },
  { id: "att-3", name: "Chất liệu", code: "material", values: ["Cotton 100%", "Kaki", "Denim", "Lụa", "Linen"] },
];

// --- 5. PAYMENTS & REFUNDS ---
export const MOCK_PAYMENTS = {
  content: [
    { id: "pay-1", code: "PAY-2026-001", orderCode: "ORD-2026-001", amount: { amount: "750000", display: "750.000 ₫", currency: "VND", symbol: "₫" }, method: "VNPAY", status: "SUCCESS", createdAt: "2026-09-21T10:16:00Z" },
    { id: "pay-2", code: "PAY-2026-002", orderCode: "ORD-2026-002", amount: { amount: "1250000", display: "1.250.000 ₫", currency: "VND", symbol: "₫" }, method: "BANK_TRANSFER", status: "SUCCESS", createdAt: "2026-09-21T09:31:00Z" },
    { id: "pay-3", code: "PAY-2026-005", orderCode: "ORD-2026-005", amount: { amount: "1650000", display: "1.650.000 ₫", currency: "VND", symbol: "₫" }, method: "VNPAY", status: "SUCCESS", createdAt: "2026-09-20T19:21:00Z" },
  ],
  page: 1,
  size: 20,
  totalElements: 3,
  totalPages: 1,
  first: true,
  last: true,
};

export const MOCK_REFUNDS = {
  content: [
    { id: "ref-1", code: "REF-2026-001", orderCode: "ORD-2026-000", amount: { amount: "390000", display: "390.000 ₫", currency: "VND", symbol: "₫" }, reason: "Khách huỷ đơn trước khi giao", status: "COMPLETED", createdAt: "2026-09-20T16:00:00Z" },
  ],
  page: 1,
  size: 20,
  totalElements: 1,
  totalPages: 1,
  first: true,
  last: true,
};

// --- 6. PROMOTIONS ---
export const MOCK_PROMOTIONS = {
  content: [
    { id: "prm-1", code: "FITLYNEW", name: "Giảm 10% đơn đầu", type: "PERCENT", value: 10, minOrderValue: 200000, isActive: true, usageLimit: 500, usedCount: 142, startsAt: "2026-09-01T00:00:00Z", endsAt: "2026-12-31T23:59:59Z" },
    { id: "prm-2", code: "FREESHIP", name: "Miễn phí vận chuyển", type: "FIXED", value: 30000, minOrderValue: 499000, isActive: true, usageLimit: 1000, usedCount: 320, startsAt: "2026-09-01T00:00:00Z", endsAt: "2026-12-31T23:59:59Z" },
    { id: "prm-3", code: "SALE10", name: "Ưu đãi thành viên", type: "PERCENT", value: 10, minOrderValue: 300000, isActive: true, usageLimit: 300, usedCount: 88, startsAt: "2026-09-15T00:00:00Z", endsAt: "2026-10-15T23:59:59Z" },
  ],
  page: 1,
  size: 20,
  totalElements: 3,
  totalPages: 1,
  first: true,
  last: true,
};

// --- 7. REVIEWS ---
export const MOCK_REVIEWS = {
  content: [
    { id: "rev-1", productName: "Áo Thun Basic Cotton Compact", customerName: "Nguyễn Lan", rating: 5, comment: "Vải mềm mát, form vừa vặn rất ưng ý! Sẽ ủng hộ shop dài dài.", status: "APPROVED", createdAt: "2026-09-20T14:30:00Z" },
    { id: "rev-2", productName: "Quần Jean Slimfit Co Giãn", customerName: "Trần Quân", rating: 5, comment: "Chất jean co giãn tốt, màu đẹp đúng như ảnh quảng cáo.", status: "APPROVED", createdAt: "2026-09-19T11:20:00Z" },
    { id: "rev-3", productName: "Áo Sơ Mi Oxford Dài Tay", customerName: "Vũ Minh", rating: 4, comment: "Áo đứng form, giao hàng nhanh trong ngày.", status: "APPROVED", createdAt: "2026-09-18T16:45:00Z" },
  ],
  page: 1,
  size: 20,
  totalElements: 3,
  totalPages: 1,
  first: true,
  last: true,
};

// --- 8. SYSTEM (Banners, FAQs, Settings, etc.) ---
export const MOCK_BANNERS = {
  content: [
    { id: "ban-1", title: "Bộ sưu tập Thu Đông 2026", position: "HOME_HERO", imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200", linkUrl: "/products", isActive: true, sortOrder: 1 },
    { id: "ban-2", title: "Ưu đãi Đơn Đầu -10%", position: "HOME_MIDDLE", imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200", linkUrl: "/promotions", isActive: true, sortOrder: 2 },
  ],
  page: 1,
  size: 20,
  totalElements: 2,
  totalPages: 1,
  first: true,
  last: true,
};

export const MOCK_FAQS = {
  content: [
    { id: "faq-1", question: "Chính sách đổi hàng của FITLY thế nào?", answer: "Hỗ trợ đổi size/mẫu trong vòng 15 ngày kể từ ngày nhận hàng với sản phẩm còn nguyên tem mác.", category: "Chính sách", isActive: true, sortOrder: 1 },
    { id: "faq-2", question: "Bao lâu thì tôi nhận được hàng?", answer: "Khu vực nội thành TP.HCM nhận trong 24h. Các tỉnh thành khác từ 2-3 ngày làm việc.", category: "Vận chuyển", isActive: true, sortOrder: 2 },
    { id: "faq-3", question: "Shop có hỗ trợ kiểm hàng trước khi thanh toán không?", answer: "FITLY hỗ trợ khách hàng đồng kiểm ngoại quan sản phẩm trước khi thanh toán COD.", category: "Thanh toán", isActive: true, sortOrder: 3 },
  ],
  page: 1,
  size: 20,
  totalElements: 3,
  totalPages: 1,
  first: true,
  last: true,
};

export const MOCK_SETTINGS = {
  storeName: "FITLY — EcoFashion",
  hotline: "1900 6868",
  email: "support@fitly.vn",
  address: "123 Đường Thời Trang, Quận 1, TP. Hồ Chí Minh",
  freeshipThreshold: 499000,
  defaultShippingFee: 30000,
};

// --- 9. IDENTITY: ROLES & USERS ---
export const MOCK_ROLES = [
  { id: "role-admin", code: "ADMIN", name: "Quản trị viên toàn quyền", description: "Toàn quyền quản trị hệ sinh thái FITLY", permissionsCount: 52 },
  { id: "role-manager", code: "MANAGER", name: "Quản lý cửa hàng", description: "Quản lý vận hành, đơn hàng và danh mục", permissionsCount: 40 },
  { id: "role-warehouse", code: "WAREHOUSE", name: "Nhân viên kho", description: "Quản lý nhập xuất tồn và phiếu kho", permissionsCount: 12 },
  { id: "role-sales", code: "SALES", name: "Nhân viên bán hàng", description: "Xử lý đơn hàng, đổi trả và hỗ trợ khách", permissionsCount: 16 },
  { id: "role-accountant", code: "ACCOUNTANT", name: "Kế toán", description: "Theo dõi doanh thu, dòng tiền và hoàn tiền", permissionsCount: 14 },
  { id: "role-marketing", code: "MARKETING", name: "Nhân viên Marketing", description: "Quản lý chiến dịch, khuyến mãi và banner", permissionsCount: 15 },
];

export const MOCK_USERS = {
  content: [
    { id: "u-admin", email: "admin@ecofashion.vn", fullName: "Quản Trị Viên FITLY", roleName: "Quản trị viên toàn quyền", roleCode: "ADMIN", status: "ACTIVE", phone: "0900000001", createdAt: "2026-09-01T00:00:00Z" },
    { id: "u-kho", email: "kho@ecofashion.vn", fullName: "Nhân Viên Kho FITLY", roleName: "Nhân viên kho", roleCode: "WAREHOUSE", status: "ACTIVE", phone: "0900000002", createdAt: "2026-09-01T00:00:00Z" },
    { id: "u-banhang", email: "banhang@ecofashion.vn", fullName: "Nhân Viên Bán Hàng FITLY", roleName: "Nhân viên bán hàng", roleCode: "SALES", status: "ACTIVE", phone: "0900000003", createdAt: "2026-09-01T00:00:00Z" },
    { id: "u-ketoan", email: "ketoan@ecofashion.vn", fullName: "Nhân Viên Kế Toán FITLY", roleName: "Kế toán", roleCode: "ACCOUNTANT", status: "ACTIVE", phone: "0900000004", createdAt: "2026-09-01T00:00:00Z" },
    { id: "u-mkt", email: "marketing@ecofashion.vn", fullName: "Nhân Viên Marketing FITLY", roleName: "Nhân viên Marketing", roleCode: "MARKETING", status: "ACTIVE", phone: "0900000005", createdAt: "2026-09-01T00:00:00Z" },
  ],
  page: 1,
  size: 20,
  totalElements: 5,
  totalPages: 1,
  first: true,
  last: true,
};

// --- 10. AI ---
export const MOCK_AI_DOCUMENTS = {
  content: [
    { id: "doc-1", title: "Chính sách đổi trả sản phẩm 2026", status: "INDEXED", totalChunks: 14, updatedAt: "2026-09-15T09:00:00Z" },
    { id: "doc-2", title: "Cẩm nang chọn size quần áo FITLY", status: "INDEXED", totalChunks: 8, updatedAt: "2026-09-15T09:30:00Z" },
  ],
  page: 1,
  size: 20,
  totalElements: 2,
  totalPages: 1,
  first: true,
  last: true,
};
