"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, GavelIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import type { ReturnRequestResponse } from "@/lib/api/generated/model";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { RETURN_ESCALATE_SOURCE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { ReturnBody } from "@/features/order/components/returns-common/return-body";
import { ReturnDeadline } from "@/features/order/components/returns-common/return-deadline";
import { ReturnResolveDialog } from "@/features/order/components/returns/return-resolve-dialog";
import { useNow } from "@/features/order/hooks/use-now";
import { useAdminReturn } from "@/features/order/hooks/use-returns";
import { returnStatusMeta } from "@/features/order/types/return";

const LOAD_ERROR = "Không tải được yêu cầu đổi trả.";

interface StepInfo {
  title: string;
  description: string;
  tone: "warning" | "info" | "done" | "danger" | "muted";
}

const STEP_TONE: Record<StepInfo["tone"], string> = {
  warning: "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
  info: "border-primary/30 bg-primary/5",
  done: "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
  danger: "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40",
  muted: "border-border bg-muted/40",
};

/* Ai đang giữ bước tiếp theo: chỉ `escalated` là việc của sàn, còn lại sàn chỉ xem. */
function stepInfo(r: ReturnRequestResponse): StepInfo {
  switch (r.status) {
    case "escalated":
      return {
        title: "Chờ sàn phân xử",
        description: `${RETURN_ESCALATE_SOURCE_LABEL[r.escalateSource ?? ""] ?? "Yêu cầu đã chuyển lên sàn"}. Xem bằng chứng của cả khách và shop bên dưới rồi hoàn tiền cho khách hoặc từ chối lần cuối.`,
        tone: "warning",
      };
    case "requested":
      return { title: "Shop đang xử lý", description: "Shop chưa duyệt / từ chối. Quá hạn, yêu cầu tự chuyển lên sàn — sàn chỉ xem lúc này.", tone: "info" };
    case "approved":
      return {
        title: "Shop đang xử lý",
        description: r.shippedBackAt
          ? "Khách đã báo gửi hàng trả; chờ shop xác nhận đã nhận hàng. Quá hạn hoặc hàng không khớp, yêu cầu chuyển lên sàn."
          : "Shop đã duyệt, chờ khách gửi hàng về. Sàn chỉ xem lúc này.",
        tone: "info",
      };
    case "rejected":
      return r.rejectedBy === "platform"
        ? { title: "Sàn đã từ chối lần cuối", description: "Quyết định cuối cùng — khách không khiếu nại lại được.", tone: "danger" }
        : { title: "Shop đã từ chối", description: "Khách có thể khiếu nại lên sàn trong hạn; khi đó yêu cầu sẽ xuất hiện ở hàng đợi phân xử.", tone: "danger" };
    case "received":
      return { title: "Đang hoàn tiền", description: "Hàng đã được xác nhận / sàn đã phân xử hoàn tiền. Kế toán chi tiền hoàn ở màn Hoàn tiền.", tone: "info" };
    case "refunded":
      // COD-08b: khách chưa trả tiền mặt ⇒ đảo ghi thu, KHÔNG có khoản hoàn — đừng nói "đã hoàn tiền".
      return r.codReversed
        ? {
            title: "Đã đảo ghi thu COD",
            description: "Đơn COD khách chưa nhận hàng nên không có khoản nào để hoàn: đơn về \"Đã trả hàng\" (chưa thanh toán), ví cọc COD của shop ghi dòng đảo (cod_reversal). Không cần kế toán chi tiền.",
            tone: "done",
          }
        : { title: "Đã hoàn tiền cho khách", description: "Yêu cầu đã hoàn tất.", tone: "done" };
    case "cancelled":
      return { title: "Khách đã rút yêu cầu", description: "Yêu cầu bị đóng, không có khoản nào phải hoàn.", tone: "muted" };
    case "expired":
      return { title: "Hết hạn gửi hàng trả", description: "Khách không gửi hàng về kịp hạn nên yêu cầu tự đóng.", tone: "muted" };
    default:
      return { title: returnStatusMeta(r).label, description: "", tone: "info" };
  }
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/*
 * Chi tiết đổi trả cổng SÀN: đủ bằng chứng hai phía + dòng thời gian (thân dùng chung với cổng shop). Hành động DUY NHẤT là
 * "Phân xử" (quyền order.return.process), chỉ khi `escalated`; yêu cầu còn do shop xử lý thì chỉ xem kèm nhãn ai đang giữ bước và hạn.
 * Backend vẫn kiểm trạng thái (409 ORDER_RETURN_INVALID_STATE) nếu đồng nghiệp đã phân xử trước.
 */
export function ReturnDetail({ id }: { id: string }) {
  const { data: r, isPending, error } = useAdminReturn(id);
  const now = useNow();
  const [resolveOpen, setResolveOpen] = useState(false);

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;
  if (isPending || !r) return <DetailSkeleton />;

  const status = returnStatusMeta(r);
  const step = stepInfo(r);
  const escalated = r.status === "escalated";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={`Đổi trả đơn ${r.orderCode}`} description={`${r.shopName} · gửi lúc ${formatDateTime(r.createdAt)}`}>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        <Button variant="outline" nativeButton={false} render={<Link href={ROUTES.order.returns} />}>
          <ArrowLeftIcon className="size-4" />
          <span className="hidden sm:inline">Danh sách</span>
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={`${ROUTES.order.orders}/${r.orderCode}`} />}>
          Xem đơn
        </Button>
      </PageHeader>

      <div className={cn("flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between", STEP_TONE[step.tone])}>
        <div className="min-w-0 text-sm">
          <p className="font-semibold">{step.title}</p>
          {step.description ? <p className="pt-0.5 text-muted-foreground">{step.description}</p> : null}
          <div className="pt-1.5">
            <ReturnDeadline deadlineAt={r.deadlineAt} deadlineKind={r.deadlineKind} now={now} />
          </div>
        </div>
        {escalated ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <PermissionGate
              permission={PERMISSIONS.returnProcess}
              fallback={<p className="text-xs text-muted-foreground">Bạn chỉ có quyền xem — CSKH hoặc quản trị viên mới phân xử được.</p>}
            >
              <Button onClick={() => setResolveOpen(true)}>
                <GavelIcon className="size-4" />
                Phân xử
              </Button>
            </PermissionGate>
          </div>
        ) : null}
      </div>

      <ReturnBody request={r} />

      <ReturnResolveDialog request={r} open={resolveOpen} onOpenChange={setResolveOpen} />
    </div>
  );
}
