import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import {
  MOCK_AI_DOCUMENTS,
  MOCK_ATTRIBUTES,
  MOCK_BANNERS,
  MOCK_CATEGORIES,
  MOCK_COLLECTIONS,
  MOCK_DASHBOARD,
  MOCK_FAQS,
  MOCK_INVENTORY_REPORT,
  MOCK_ORDERS,
  MOCK_PAYMENTS,
  MOCK_PRODUCTS,
  MOCK_PROMOTIONS,
  MOCK_RECEIPTS,
  MOCK_REFUNDS,
  MOCK_RETURNS,
  MOCK_REVENUE_REPORT,
  MOCK_REVIEWS,
  MOCK_ROLES,
  MOCK_SETTINGS,
  MOCK_STOCK,
  MOCK_TOP_PRODUCTS,
  MOCK_USERS,
} from "./mock-admin-data";

/*
 * CÔNG TẮC CHẾ ĐỘ MOCK CHO FITLY ADMIN
 * Mặc định: BẬT MOCK cho các chức năng quản trị, GIỮ THẬT cho luồng Đăng nhập & Phân quyền.
 * Để gọi toàn bộ API thật: đặt NEXT_PUBLIC_ENABLE_MOCK=false trong .env.local
 */
export const CHE_DO_MOCK = process.env.NEXT_PUBLIC_ENABLE_MOCK !== "false";

/* Các endpoint xác thực và hồ sơ người dùng ĐƯỢC KẾT NỐI VỚI BACKEND THẬT */
const REAL_AUTH_PATHS = [
  "/auth/login",
  "/auth/me",
  "/auth/refresh",
  "/auth/logout",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/change-password",
  "/users/me",
];

export function shouldMockEndpoint(url?: string): boolean {
  if (!CHE_DO_MOCK || !url) return false;
  // Auth endpoints luôn chạy thật với backend NestJS
  const isAuth = REAL_AUTH_PATHS.some((path) => url.includes(path));
  if (isAuth) return false;
  return true;
}

export function getMockResponse(config: InternalAxiosRequestConfig): AxiosResponse {
  const url = config.url || "";
  const method = (config.method || "get").toLowerCase();

  let data: unknown = null;

  // Xử lý các phương thức ghi (POST, PUT, PATCH, DELETE) trong chế độ mock
  if (method !== "get") {
    data = { id: "mock-created-" + Date.now(), success: true };
  } else if (url.includes("/reports/dashboard")) {
    data = MOCK_DASHBOARD;
  } else if (url.includes("/reports/revenue")) {
    data = MOCK_REVENUE_REPORT;
  } else if (url.includes("/reports/inventory")) {
    data = MOCK_INVENTORY_REPORT;
  } else if (url.includes("/reports/top")) {
    data = MOCK_TOP_PRODUCTS;
  } else if (url.includes("/reports/low-stock")) {
    data = MOCK_STOCK.content.slice(0, 3);
  } else if (url.includes("/admin/products") || url.includes("/products")) {
    if (url.match(/\/products\/[a-zA-Z0-9_-]+$/)) {
      data = MOCK_PRODUCTS.content[0];
    } else {
      data = MOCK_PRODUCTS;
    }
  } else if (url.includes("/admin/inventory/stock")) {
    data = MOCK_STOCK;
  } else if (url.includes("/admin/inventory/receipts")) {
    data = MOCK_RECEIPTS;
  } else if (url.includes("/admin/orders") || url.includes("/orders")) {
    if (url.match(/\/orders\/[a-zA-Z0-9_-]+$/)) {
      data = MOCK_ORDERS.content[0];
    } else {
      data = MOCK_ORDERS;
    }
  } else if (url.includes("/admin/returns")) {
    data = MOCK_RETURNS;
  } else if (url.includes("/admin/payments")) {
    data = MOCK_PAYMENTS;
  } else if (url.includes("/admin/refunds")) {
    data = MOCK_REFUNDS;
  } else if (url.includes("/categories")) {
    data = MOCK_CATEGORIES;
  } else if (url.includes("/collections")) {
    data = MOCK_COLLECTIONS;
  } else if (url.includes("/attributes")) {
    data = MOCK_ATTRIBUTES;
  } else if (url.includes("/promotions")) {
    data = MOCK_PROMOTIONS;
  } else if (url.includes("/reviews")) {
    data = MOCK_REVIEWS;
  } else if (url.includes("/system/banners")) {
    data = MOCK_BANNERS;
  } else if (url.includes("/system/faqs")) {
    data = MOCK_FAQS;
  } else if (url.includes("/system/settings")) {
    data = MOCK_SETTINGS;
  } else if (url.includes("/admin/roles")) {
    data = MOCK_ROLES;
  } else if (url.includes("/admin/users")) {
    data = MOCK_USERS;
  } else if (url.includes("/ai/documents")) {
    data = MOCK_AI_DOCUMENTS;
  } else {
    // Mặc định trả về trang rỗng hợp lệ
    data = {
      content: [],
      page: 1,
      size: 20,
      totalElements: 0,
      totalPages: 1,
      first: true,
      last: true,
    };
  }

  return {
    data: {
      success: true,
      message: "Dữ liệu mẫu",
      data,
      error: null,
      requestId: "mock-" + Date.now(),
      timestamp: new Date().toISOString(),
    },
    status: 200,
    statusText: "OK",
    headers: { "content-type": "application/json" },
    config,
  };
}

export async function mockAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  // Trì hoãn nhẹ 100ms để mô phỏng tải trang và giữ skeleton mượt mà
  await new Promise((resolve) => setTimeout(resolve, 100));
  return getMockResponse(config);
}
