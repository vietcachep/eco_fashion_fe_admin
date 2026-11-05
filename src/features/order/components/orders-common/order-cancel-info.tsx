import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailList, type DetailRow } from "@/components/shared/detail-list";
import { StatusBadge } from "@/components/shared/status-badge";
import type { OrderCancelRequestResponse, OrderResponse } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format";
import { CANCELLED_BY_LABEL, CANCEL_REASON_LABEL, CANCEL_REQUEST_STATUS, statusMeta } from "@/lib/labels";

/*
 * Các dòng của YÊU CẦU HUỶ do khách gửi khi đơn đang đóng gói (PLAN-0027 §2.2): trạng thái, lý do khách chọn, ghi chú, hạn shop xử lý
 * (quá hạn hệ thống tự chấp nhận; `hideDue` khi nơi gọi đã hiện đếm ngược riêng) và — nếu shop từ chối — lý do từ chối. Dùng chung khung xử lý của shop
 * và thẻ chỉ-xem của sàn.
 * `reasonLabel` do backend gửi sẵn nên không tự dịch lại từ `reasonCode`.
 */
export function cancelRequestRows(r: OrderCancelRequestResponse, opts: { hideDue?: boolean } = {}): DetailRow[] {
  const status = statusMeta(CANCEL_REQUEST_STATUS, r.status);
  const rows: DetailRow[] = [
    { label: "Trạng thái", value: <StatusBadge tone={status.tone}>{status.label}</StatusBadge> },
    { label: "Lý do của khách", value: r.reasonLabel || (r.reasonCode && CANCEL_REASON_LABEL[r.reasonCode]) || r.reasonCode || "—" },
  ];
  if (r.note) rows.push({ label: "Ghi chú của khách", value: r.note });
  rows.push({ label: "Gửi lúc", value: formatDateTime(r.requestedAt) });
  if (r.status === "pending" && !opts.hideDue) {
    rows.push({
      label: "Hạn shop xử lý",
      value: (
        <span>
          {formatDateTime(r.dueAt)}
          <span className="block text-xs font-normal text-muted-foreground">Quá hạn mà shop chưa xử lý, hệ thống tự chấp nhận và huỷ đơn.</span>
        </span>
      ),
    });
  }
  if (r.status === "rejected" && r.rejectReason) rows.push({ label: "Lý do shop từ chối", value: r.rejectReason });
  return rows;
}

/* Thẻ CHỈ-XEM yêu cầu huỷ của khách — cổng sàn (CSKH cần biết khách đã yêu cầu và shop trả lời gì). Cổng shop có khung xử lý riêng. */
export function CancelRequestInfoCard({ request }: { request: OrderCancelRequestResponse }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Yêu cầu huỷ của khách</CardTitle>
      </CardHeader>
      <CardContent>
        <DetailList rows={cancelRequestRows(request)} />
      </CardContent>
    </Card>
  );
}

type CancelFields = Pick<OrderResponse, "status" | "cancelledBy" | "cancelReasonCode" | "cancelReason">;

/*
 * "Ai huỷ & vì sao" của đơn đã huỷ: bên huỷ (`cancelledBy`: khách · gian hàng · sàn · hệ thống), mã lý do chuẩn (`cancelReasonCode`) và
 * lý do chi tiết. Đơn huỷ trước đợt PLAN-0027 không có hai mã đầu → "—", vẫn hiện lý do chữ. Đơn chưa huỷ thì không hiện thẻ.
 */
export function OrderCancelCard({ order }: { order: CancelFields }) {
  if (order.status !== "cancelled") return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Thông tin huỷ đơn</CardTitle>
      </CardHeader>
      <CardContent>
        <DetailList
          rows={[
            { label: "Huỷ bởi", value: (order.cancelledBy && CANCELLED_BY_LABEL[order.cancelledBy]) || "—" },
            { label: "Mã lý do", value: (order.cancelReasonCode && (CANCEL_REASON_LABEL[order.cancelReasonCode] ?? order.cancelReasonCode)) || "—" },
            { label: "Lý do chi tiết", value: order.cancelReason || "—" },
          ]}
        />
      </CardContent>
    </Card>
  );
}
