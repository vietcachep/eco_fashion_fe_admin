import type { Money } from "@/types/common";

/*
 * DTO báo cáo — chép từ backend `src/modules/reporting/reporting.service.ts`
 * (Swagger không khai schema response cho /admin/reports nên Orval không sinh).
 * Backend đổi DTO phải đổi đây.
 */
export interface DailyPoint {
  day: string;
  orderCount: number;
  paidCount: number;
  cancelledCount: number;
  revenue: Money;
  discount: Money;
  shippingFee: Money;
  itemsSold: number;
  newCustomers: number;
  refunded: Money;
}

export interface TopProductRow {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  quantity: number;
  revenue: Money;
  orderCount: number;
}

export interface DashboardResponse {
  today: DailyPoint;
  month: {
    revenue: Money;
    orderCount: number;
    paidCount: number;
    itemsSold: number;
    newCustomers: number;
    refunded: Money;
  };
  pending: {
    awaitingConfirm: number;
    awaitingPayment: number;
    packing: number;
    shipping: number;
    returnsRequested: number;
    transfersToConfirm: number;
    refundsRequested: number;
    contactsNew: number;
    supportOpen: number;
    lowStock: number;
  };
  last7Days: DailyPoint[];
  topProducts: TopProductRow[];
  orderStatus: Array<{ status: string; count: number }>;
  paymentMethods: Array<{ method: string; count: number; revenue: Money }>;
  generatedAt: string;
}

export interface LowStockRow {
  variantId: string;
  productId: string;
  productName: string;
  slug: string;
  sku: string;
  colorName: string;
  sizeCode: string;
  stock: number;
  reserved: number;
  available: number;
}

export interface RevenuePoint {
  period: string;
  revenue: Money;
  orderCount: number;
  paidCount: number;
  cancelledCount: number;
  itemsSold: number;
  discount: Money;
  refunded: Money;
}

export interface RevenueResponse {
  from: string;
  to: string;
  granularity: "day" | "month";
  points: RevenuePoint[];
  total: Omit<RevenuePoint, "period">;
}

export interface InventorySummary {
  products: number;
  variants: number;
  unitsInStock: number;
  unitsReserved: number;
  stockValue: Money;
  lowStock: number;
  outOfStock: number;
}
