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
  bankCode: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  transferContent: string | null;
  refundedAmount: Money;
  paidAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface RefundResponse {
  id: string;
  orderCode: string;
  amount: Money;
  status: string;
  method: string;
  reason: string | null;
  note: string | null;
  providerRef: string | null;
  processedAt: string | null;
  createdAt: string;
  /* order = hoàn theo đơn · duplicate_payment = hoàn khoản khách trả trùng (đơn vẫn giữ trạng thái đã thanh toán). */
  kind: string;
  /* failed mà cổng VNPay từng được gọi không rõ kết quả — phải đối chiếu trên cổng trước khi hoàn lại. */
  needsReconcile: boolean;
}
