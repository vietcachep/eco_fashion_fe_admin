import { StatusBadge } from "@/components/shared/status-badge";
import { ORDER_PAYMENT_STATUS, PAYMENT_METHOD_LABEL, statusMeta, type StatusMeta } from "@/lib/labels";

/*
 * Thanh toán của đơn nhìn từ phía shop: shop cần biết "tiền đã về chưa" chứ
 * không cần mã giao dịch. COD chưa thu = bình thường (thu khi giao) nên hiện
 * trung tính; đơn online chưa trả = đang chờ khách → màu cảnh báo vì shop chưa
 * xác nhận được.
 */
function paymentMeta(method: string, status: string): StatusMeta {
  if (method === "cod") {
    if (status === "unpaid") return { label: "Thu tiền khi giao", tone: "pending" };
    if (status === "paid") return { label: "Đã thu tiền", tone: "success" };
  } else if (status === "unpaid") {
    return { label: "Chờ thanh toán", tone: "warning" };
  }
  return statusMeta(ORDER_PAYMENT_STATUS, status);
}

export function ShopPaymentBadge({
  method,
  status,
  showMethod = true,
}: {
  method: string;
  status: string;
  /** Dòng phụ tên phương thức (COD / Chuyển khoản / VNPay / PayOS) dưới badge. */
  showMethod?: boolean;
}) {
  const meta = paymentMeta(method, status);
  return (
    <div className="flex flex-col items-start gap-0.5">
      <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
      {showMethod ? <span className="text-xs text-muted-foreground">{PAYMENT_METHOD_LABEL[method] ?? method}</span> : null}
    </div>
  );
}
