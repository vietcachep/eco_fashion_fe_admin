import type { MoneyResponse } from "@/lib/api/generated/model";

/*
 * Điểm biểu đồ doanh thu của shop. Dashboard trả theo `day`, báo cáo doanh thu
 * trả theo `period` (yyyy-mm-dd hoặc yyyy-mm) — màn map về một dạng để dùng
 * chung MỘT biểu đồ.
 */
export interface ShopChartPoint {
  period: string;
  revenue: MoneyResponse;
  orderCount: number;
}

/* Khoảng ngày yyyy-mm-dd (giờ Việt Nam) gửi báo cáo. */
export interface ShopDayRange {
  from: string;
  to: string;
}

/*
 * Định nghĩa doanh thu của backend (shop-reporting.service.ts) — hiện nguyên văn
 * trên dashboard / báo cáo để chủ shop hiểu vì sao số khác tổng tiền đơn.
 */
export const REVENUE_DEFINITION =
  "Doanh thu = đơn đã thanh toán, không huỷ; gồm cả phần voucher sàn hoàn cho shop; tính theo ngày tạo đơn, giờ Việt Nam.";
