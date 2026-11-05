import type { Money } from "@/types/common";

/*
 * DTO thanh toán — Swagger không khai schema response cho /admin/payments*.
 * Chép từ backend `payment/payment/payment.service.ts`.
 */
export interface PaymentMethodResponse {
  code: string;
  name: string;
  description: string | null;
  kind: string;
  isActive: boolean;
  sortOrder: number;
}

export interface PaymentResponse {
  id: string;
  orderCode: string;
  methodCode: string;
  amount: Money;
  status: string;
  transactionCode: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  refundedAmount: Money;
  /**
   * PLAN-0040 (PLAN-0025 §2.4): tổng tiền PayOS đã nhận cho giao dịch này, cộng dồn từng khoản — khác `amount` khi khách trả thiếu / thừa.
   * Hợp đồng (docs/06_FE_CONTRACT.md) nói response có trường này nhưng `PaymentService.toPayment` của backend chưa trả — nên khai TUỲ CHỌN và UI
   * chỉ hiện khi có (xem báo cáo Admin-A).
   */
  receivedAmount?: Money;
  paidAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}
