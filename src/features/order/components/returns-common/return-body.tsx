import { ImageIcon, Undo2Icon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailList, type DetailRow } from "@/components/shared/detail-list";
import { StatusBadge } from "@/components/shared/status-badge";
import type { ReturnRequestResponse } from "@/lib/api/generated/model";
import { formatDateTime, formatNumber } from "@/lib/format";
import {
  ORDER_REFUND_STATUS,
  RETURN_ESCALATE_SOURCE_LABEL,
  RETURN_REASON_LABEL,
  RETURN_RECEIVED_CONDITION_LABEL,
  RETURN_RESOLVE_DECISION_LABEL,
  statusMeta,
} from "@/lib/labels";
import { ReturnEvidence } from "@/features/order/components/returns-common/return-evidence";
import { ReturnTimeline } from "@/features/order/components/returns-common/return-timeline";

/* Chỉ giữ dòng có giá trị — bước chưa xảy ra (chưa gửi hàng, chưa nhận…) khỏi chiếm chỗ bằng "—". */
const present = (rows: Array<DetailRow | false | null | undefined | "">): DetailRow[] => rows.filter((r): r is DetailRow => !!r);

/*
 * Thân chi tiết đổi trả DÙNG CHUNG cổng shop và cổng sàn: hàng trả, minh chứng hai phía, thông tin từng bước, dòng thời gian.
 * Khác biệt giữa hai cổng nằm ở dữ liệu backend trả (shop KHÔNG có `refundAccount`; chỉ sàn có `resolvedBy`) nên thân này
 * dựa vào dữ liệu có mặt, không cần cờ "đang ở cổng nào". Banner + nút hành động do từng cổng tự dựng ở trên.
 */
export function ReturnBody({ request: r }: { request: ReturnRequestResponse }) {
  const refund = r.refund ? statusMeta(ORDER_REFUND_STATUS, r.refund.status) : null;
  // Đảo ghi thu COD: refundAmount = 0 là CHỦ Ý (không có khoản hoàn) — không coi là "shop đã giảm số tiền".
  const adjusted = !r.codReversed && r.calculatedRefundAmount.amount !== r.refundAmount.amount;
  const account = r.refundAccount;

  const requestRows = present([
    { label: "Lý do", value: RETURN_REASON_LABEL[r.reasonCode] ?? r.reasonCode },
    r.reason && r.reason !== RETURN_REASON_LABEL[r.reasonCode] && { label: "Khách ghi", value: r.reason },
    { label: "Mô tả chi tiết", value: r.detail || "—" },
    {
      label: "Cách xử lý",
      value: r.requireReturn
        ? "Khách gửi hàng trả về shop"
        : "Không cần trả hàng (khách chưa nhận hàng) — đơn online: hoàn tiền; đơn COD chưa thu tiền: đảo ghi thu, không hoàn tiền",
    },
    {
      label: "Số tiền hoàn",
      value: r.codReversed ? (
        "Không hoàn tiền — đã đảo ghi thu COD"
      ) : (
        <span>
          {r.refundAmount.display}
          {adjusted ? <span className="block text-xs font-normal text-muted-foreground">Hệ thống tính {r.calculatedRefundAmount.display}</span> : null}
        </span>
      ),
    },
    r.adjustReason && { label: "Lý do chỉnh số tiền", value: r.adjustReason },
    account && {
      label: "TK nhận hoàn của khách",
      value: (
        <span>
          {account.accountName} · <span className="font-mono">{account.accountNumberMasked}</span>
          <span className="block text-xs font-normal text-muted-foreground">{account.bankName || `Ngân hàng (BIN ${account.bankBin})`}</span>
        </span>
      ),
    },
    r.refund && {
      label: "Trạng thái hoàn tiền",
      value: (
        <span className="inline-flex flex-wrap items-center gap-2">
          {refund ? <StatusBadge tone={refund.tone}>{refund.label}</StatusBadge> : null}
          <span>{r.refund.amount.display}</span>
        </span>
      ),
    },
    { label: "Gửi lúc", value: formatDateTime(r.createdAt) },
  ]);

  const shipRows = present([
    r.returnAddress && {
      label: "Địa chỉ nhận hàng trả",
      value: (
        <span>
          {r.returnAddress.name} · {r.returnAddress.phone}
          <span className="block text-xs font-normal text-muted-foreground">{r.returnAddress.address}</span>
        </span>
      ),
    },
    (r.carrier || r.trackingCode) && {
      label: "Vận đơn khách gửi",
      value: (
        <span>
          {r.carrier || "—"}
          {r.trackingCode ? <span className="font-mono"> · {r.trackingCode}</span> : null}
        </span>
      ),
    },
    r.shippedBackAt && { label: "Khách báo gửi lúc", value: formatDateTime(r.shippedBackAt) },
    r.receivedAt && {
      label: "Shop nhận hàng",
      value: `${RETURN_RECEIVED_CONDITION_LABEL[r.receivedCondition ?? ""] ?? "—"} · ${formatDateTime(r.receivedAt)}`,
    },
    r.receivedNote && { label: "Ghi chú nhận hàng", value: r.receivedNote },
  ]);

  const decisionRows = present([
    r.rejectedBy && { label: r.rejectedBy === "platform" ? "Sàn từ chối" : "Shop từ chối", value: r.rejectReason || "—" },
    r.escalatedAt && {
      label: "Chuyển sàn",
      value: (
        <span>
          {RETURN_ESCALATE_SOURCE_LABEL[r.escalateSource ?? ""] ?? "—"}
          <span className="block text-xs font-normal text-muted-foreground">{formatDateTime(r.escalatedAt)}</span>
        </span>
      ),
    },
    r.escalateReason && { label: "Nội dung khiếu nại / báo cáo", value: r.escalateReason },
    r.resolvedAt && {
      label: "Sàn phân xử",
      value: (
        <span>
          {RETURN_RESOLVE_DECISION_LABEL[r.resolveDecision ?? ""] ?? "—"}
          <span className="block text-xs font-normal text-muted-foreground">{formatDateTime(r.resolvedAt)}</span>
        </span>
      ),
    },
    r.resolveNote && { label: "Ghi chú phân xử", value: r.resolveNote },
    r.refundedAt && { label: r.codReversed ? "Đảo ghi thu COD lúc" : "Hoàn tiền xong", value: formatDateTime(r.refundedAt) },
  ]);

  const hasShopEvidence = r.rejectEvidence.length > 0 || r.receivedEvidence.length > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        {r.codReversed ? (
          <div
            role="status"
            className="flex gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
          >
            <Undo2Icon className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">Đã đảo ghi thu COD — khách không phải trả tiền</p>
              <p className="pt-0.5">
                Khách báo chưa nhận hàng nên chưa từng trả tiền mặt: hệ thống <b>không tạo khoản hoàn tiền</b>. Đơn chuyển về &ldquo;Đã trả hàng&rdquo; (chưa thanh
                toán) và ví cọc COD của shop được điều chỉnh ngược lại — trả lại hoa hồng đã trừ, thu lại phần voucher sàn đã bù (nếu có).
              </p>
            </div>
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hàng trả</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {r.items.map((it) => (
              <div key={it.orderItemId} className="flex items-center gap-3 text-sm">
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
                  {it.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- ảnh động
                    <img src={it.imageUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <ImageIcon className="size-4 text-muted-foreground/60" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{it.name}</p>
                  <p className="text-xs text-muted-foreground">{[it.color, it.size].filter((s) => !!s && s.trim() !== "").join(" · ")}</p>
                </div>
                <span>× {formatNumber(it.quantity)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {r.evidence.length || hasShopEvidence ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Minh chứng</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ReturnEvidence title="Của khách (khi gửi yêu cầu)" items={r.evidence} />
              <ReturnEvidence title="Của shop khi từ chối" items={r.rejectEvidence} />
              <ReturnEvidence title="Của shop khi nhận hàng" items={r.receivedEvidence} />
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dòng thời gian</CardTitle>
          </CardHeader>
          <CardContent>
            <ReturnTimeline request={r} />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yêu cầu của khách</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList rows={requestRows} />
          </CardContent>
        </Card>
        {shipRows.length ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gửi trả &amp; nhận hàng</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList rows={shipRows} />
            </CardContent>
          </Card>
        ) : null}
        {decisionRows.length ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quyết định</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList rows={decisionRows} />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
