import type { ReturnRequestResponse } from "@/lib/api/generated/model";
import { formatDateTime, formatVnd } from "@/lib/format";
import { RETURN_ESCALATE_SOURCE_LABEL, RETURN_RECEIVED_CONDITION_LABEL, RETURN_RESOLVE_DECISION_LABEL } from "@/lib/labels";

interface TimelineEvent {
  at: string;
  title: string;
  detail?: string | null;
}

/*
 * Dòng thời gian dựng từ các DẤU MỐC của từng bước trên response (backend không trả danh sách sự kiện). Chỉ bước nào đã có mốc
 * thời gian mới hiện; sắp theo thời gian tăng dần. Khách rút / hết hạn gửi hàng không có mốc riêng — trạng thái hiện ở tiêu đề màn.
 */
function buildEvents(r: ReturnRequestResponse): TimelineEvent[] {
  const events: TimelineEvent[] = [{ at: r.createdAt, title: "Khách gửi yêu cầu đổi trả", detail: r.reason }];

  if (r.approvedAt) {
    events.push({
      at: r.approvedAt,
      title: r.requireReturn ? "Shop duyệt — chờ khách gửi hàng về" : "Shop duyệt — hoàn tiền, không cần trả hàng",
      detail: r.adjustReason ? `Shop giảm số tiền hoàn xuống ${formatVnd(r.refundAmount.amount)}: ${r.adjustReason}` : null,
    });
  }
  if (r.rejectedBy === "shop" && r.processedAt) {
    events.push({ at: r.processedAt, title: "Shop từ chối yêu cầu", detail: r.rejectReason });
  }
  if (r.shippedBackAt) {
    events.push({
      at: r.shippedBackAt,
      title: "Khách báo đã gửi hàng trả",
      detail: [r.carrier, r.trackingCode].filter(Boolean).join(" · ") || null,
    });
  }
  if (r.receivedAt) {
    events.push({
      at: r.receivedAt,
      title: `Shop xác nhận đã nhận hàng — ${RETURN_RECEIVED_CONDITION_LABEL[r.receivedCondition ?? ""] ?? "—"}`,
      detail: r.receivedNote,
    });
  }
  if (r.escalatedAt) {
    events.push({
      at: r.escalatedAt,
      title: `Chuyển sàn phân xử — ${RETURN_ESCALATE_SOURCE_LABEL[r.escalateSource ?? ""] ?? "chờ sàn xử lý"}`,
      detail: r.escalateReason,
    });
  }
  if (r.resolvedAt) {
    events.push({
      at: r.resolvedAt,
      title: `Sàn phân xử — ${RETURN_RESOLVE_DECISION_LABEL[r.resolveDecision ?? ""] ?? "đã xử lý"}`,
      detail: r.resolveNote,
    });
  }
  if (r.refundedAt) {
    events.push(
      r.codReversed
        ? { at: r.refundedAt, title: "Đảo ghi thu COD — khách chưa trả tiền nên không hoàn tiền", detail: null }
        : { at: r.refundedAt, title: "Hoàn tiền cho khách xong", detail: formatVnd(r.refundAmount.amount) },
    );
  }

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export function ReturnTimeline({ request }: { request: ReturnRequestResponse }) {
  const events = buildEvents(request);
  return (
    <ol className="relative ml-1 flex flex-col gap-3 border-l pl-4">
      {events.map((e, i) => (
        <li key={`${e.at}-${i}`} className="relative text-sm">
          <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-background bg-primary" />
          <p className="font-medium">{e.title}</p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(e.at)}
            {e.detail ? ` · ${e.detail}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
