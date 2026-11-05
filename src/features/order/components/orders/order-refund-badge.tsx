import { StatusBadge } from "@/components/shared/status-badge";
import type { OrderRefundResponse } from "@/lib/api/generated/model";
import { ORDER_REFUND_STATUS, statusMeta } from "@/lib/labels";

/*
 * Khoản hoàn tiền MỚI NHẤT của đơn (`order.refund`, backend tra theo lô bên payment): hiện "Đang hoàn tiền 90.000 ₫" thay vì để
 * đơn vẫn ghi "Đã thanh toán". Dùng chung màn đơn của sàn và của shop; không có khoản hoàn thì nơi gọi không render gì.
 */
export function OrderRefundBadge({ refund }: { refund: OrderRefundResponse }) {
  const meta = statusMeta(ORDER_REFUND_STATUS, refund.status);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
      <span>{refund.amount.display}</span>
    </span>
  );
}
