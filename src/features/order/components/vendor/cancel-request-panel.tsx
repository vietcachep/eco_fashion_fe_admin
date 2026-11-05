"use client";

import { useState } from "react";
import { BanIcon, CheckIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailList } from "@/components/shared/detail-list";
import { StatusBadge } from "@/components/shared/status-badge";
import type { OrderCancelRequestResponse } from "@/lib/api/generated/model";
import { CANCEL_REQUEST_STATUS, statusMeta } from "@/lib/labels";
import { PERMISSIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { usePermission } from "@/hooks/use-permission";
import { OrderDue } from "@/features/order/components/orders-common/order-due";
import { cancelRequestRows } from "@/features/order/components/orders-common/order-cancel-info";
import { CancelRequestAcceptDialog, CancelRequestRejectDialog } from "@/features/order/components/vendor/cancel-request-dialogs";

/* Lời giải thích theo trạng thái — nói rõ hệ quả của từng lựa chọn của shop. */
const DESCRIPTION: Record<OrderCancelRequestResponse["status"], string> = {
  pending:
    "Khách muốn huỷ đơn đang đóng gói. Chấp nhận: đơn được huỷ, hàng nhập lại kho, hoàn tiền nếu khách đã trả — không bị tính vi phạm. Từ chối: đơn tiếp tục được xử lý, nhưng nếu sau đó shop tự huỷ đơn sẽ bị +1 điểm vi phạm. Quá hạn mà chưa xử lý, hệ thống tự chấp nhận.",
  accepted: "Shop đã chấp nhận — đơn được huỷ theo yêu cầu của khách.",
  rejected: "Shop đã từ chối — đơn tiếp tục được xử lý. Khách đã đọc lý do từ chối.",
  auto_accepted: "Shop không xử lý kịp hạn nên hệ thống đã tự chấp nhận và huỷ đơn theo yêu cầu của khách.",
};

/*
 * Khung "Khách yêu cầu huỷ" ở chi tiết đơn của SHOP (PLAN-0027 §2.2): hiện cho cả yêu cầu đang chờ lẫn đã xử lý (để shop thấy lý do và kết quả).
 * Nút Chấp nhận / Từ chối chỉ khi `pending` và có quyền `shop.order.cancel`; thiếu quyền thấy nội dung nhưng không thấy nút. Backend kiểm lại
 * (409 ORDER_CANCEL_REQUEST_NOT_FOUND nếu khách vừa rút / job vừa tự chấp nhận) — hộp thoại hiện câu của backend và đơn được đọc lại.
 */
export function CancelRequestPanel({
  code,
  request,
  paidOnline,
  now,
}: {
  code: string;
  request: OrderCancelRequestResponse;
  paidOnline: boolean;
  now: number;
}) {
  const canDecide = usePermission(PERMISSIONS.shopOrderCancel);
  const [dialog, setDialog] = useState<"accept" | "reject" | null>(null);
  const pending = request.status === "pending";
  const status = statusMeta(CANCEL_REQUEST_STATUS, request.status);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4",
        pending ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40" : "border-border bg-muted/30",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 text-sm">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            <BanIcon className="size-4 shrink-0" />
            Khách yêu cầu huỷ đơn
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          </p>
          <p className="pt-0.5 text-muted-foreground">{DESCRIPTION[request.status]}</p>
          {pending ? (
            <div className="pt-1.5">
              <OrderDue label="Hạn shop xử lý" dueAt={request.dueAt} now={now} />
            </div>
          ) : null}
        </div>
        {pending && canDecide ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" onClick={() => setDialog("reject")}>
              <XIcon className="size-4" />
              Từ chối
            </Button>
            <Button onClick={() => setDialog("accept")}>
              <CheckIcon className="size-4" />
              Chấp nhận huỷ
            </Button>
          </div>
        ) : null}
      </div>
      {pending && !canDecide ? <p className="text-xs text-muted-foreground">Bạn chỉ có quyền xem — chủ shop cần cấp quyền huỷ đơn để xử lý yêu cầu này.</p> : null}

      <DetailList rows={cancelRequestRows(request, { hideDue: true })} />

      <CancelRequestAcceptDialog code={code} paidOnline={paidOnline} open={dialog === "accept"} onOpenChange={(o) => setDialog(o ? "accept" : null)} />
      <CancelRequestRejectDialog code={code} open={dialog === "reject"} onOpenChange={(o) => setDialog(o ? "reject" : null)} />
    </div>
  );
}
