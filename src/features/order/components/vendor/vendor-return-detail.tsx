"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CheckIcon, PackageCheckIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { RETURN_ESCALATE_SOURCE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { ReturnBody } from "@/features/order/components/returns-common/return-body";
import { ReturnDeadline } from "@/features/order/components/returns-common/return-deadline";
import { ReturnApproveDialog } from "@/features/order/components/vendor/return-approve-dialog";
import { ReturnReceiveDialog } from "@/features/order/components/vendor/return-receive-dialog";
import { ReturnRejectDialog } from "@/features/order/components/vendor/return-reject-dialog";
import { useNow } from "@/features/order/hooks/use-now";
import { useShopReturn } from "@/features/order/hooks/use-shop-returns";
import { returnStatusMeta } from "@/features/order/types/return";
import type { ShopReturnRequestResponse } from "@/lib/api/generated/model";

const LOAD_ERROR = "Không tải được yêu cầu đổi trả.";

type OpenDialog = "approve" | "reject" | "receive" | null;

interface StepInfo {
  title: string;
  description: string;
  tone: "info" | "warning" | "done" | "danger" | "muted";
}

const STEP_TONE: Record<StepInfo["tone"], string> = {
  info: "border-primary/30 bg-primary/5",
  warning: "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
  done: "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
  danger: "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40",
  muted: "border-border bg-muted/40",
};

/* Việc shop cần làm ở từng trạng thái — nói rõ ai đang giữ bước tiếp theo và chuyện gì xảy ra khi quá hạn. */
function stepInfo(r: ShopReturnRequestResponse): StepInfo {
  switch (r.status) {
    case "requested":
      return {
        title: "Chờ shop duyệt",
        description: r.requireReturn
          ? "Duyệt để khách gửi hàng trả về địa chỉ của shop, hoặc từ chối kèm lý do. Quá hạn mà shop chưa xử lý, yêu cầu tự chuyển lên sàn phân xử."
          : "Khách báo chưa nhận được hàng. Duyệt là hoàn tiền ngay cho khách (không nhập kho) — riêng đơn COD đã báo giao thì khách chưa từng trả tiền nên hệ thống ĐẢO GHI THU, không hoàn tiền; hoặc từ chối kèm lý do. Quá hạn, yêu cầu tự chuyển lên sàn phân xử.",
        tone: "info",
      };
    case "approved":
      return r.shippedBackAt
        ? {
            title: "Khách đã báo gửi hàng trả",
            description: `Khi hàng về, kiểm tra rồi xác nhận "Đã nhận hàng": đúng hàng thì nhập kho và hoàn tiền cho khách; không khớp thì chuyển sàn phân xử. Quá hạn xác nhận, yêu cầu tự chuyển sàn.`,
            tone: "info",
          }
        : {
            title: "Chờ khách gửi hàng trả",
            description: "Khách đã nhận địa chỉ gửi trả. Không gửi kịp hạn thì yêu cầu tự hết hạn. Nếu hàng đã về shop, bạn vẫn có thể xác nhận đã nhận hàng.",
            tone: "muted",
          };
    case "received":
      return {
        title: "Đã nhận hàng — đang hoàn tiền cho khách",
        description: "Kế toán sàn đang hoàn tiền. Khoản hoàn được trừ vào kỳ đối soát của shop; shop không cần thao tác thêm.",
        tone: "done",
      };
    case "refunded":
      // COD-08b: khách chưa trả tiền mặt ⇒ đảo ghi thu, KHÔNG có khoản hoàn.
      return r.codReversed
        ? {
            title: "Đã đảo ghi thu COD — khách không phải trả tiền",
            description:
              "Đơn COD khách chưa nhận hàng nên không có khoản nào để hoàn: đơn về \"Đã trả hàng\" (chưa thanh toán). Ví cọc COD của shop được điều chỉnh ngược lại — trả lại hoa hồng đã trừ, thu lại phần voucher sàn đã bù (nếu có); xem dòng đảo ở màn Ví cọc COD.",
            tone: "done",
          }
        : { title: "Đã hoàn tiền cho khách", description: "Yêu cầu đã hoàn tất.", tone: "done" };
    case "rejected":
      return r.rejectedBy === "platform"
        ? { title: "Sàn đã từ chối lần cuối", description: "Quyết định của sàn là cuối cùng — khách không khiếu nại lại được.", tone: "danger" }
        : {
            title: "Shop đã từ chối",
            description: "Khách có thể khiếu nại lên sàn trong thời hạn quy định; khi đó sàn xem lý do và minh chứng của shop để phân xử.",
            tone: "danger",
          };
    case "escalated":
      return {
        title: "Đã chuyển sàn phân xử",
        description: `${RETURN_ESCALATE_SOURCE_LABEL[r.escalateSource ?? ""] ?? "Yêu cầu chuyển lên sàn"}. Shop không cần thao tác thêm — sàn xem bằng chứng hai phía rồi quyết định, kết quả gửi cho cả shop và khách.`,
        tone: "warning",
      };
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
        <Skeleton className="h-6 w-56" />
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
 * Chi tiết đổi trả cho SHOP: khung "việc cần làm" (kèm hạn đếm ngược) + nút theo trạng thái, rồi thân dùng chung với cổng sàn
 * (hàng trả, minh chứng hai phía, dòng thời gian). Nút ghi gắn `shop.return.process`; nhân viên chỉ có `shop.return.read` thấy
 * đủ nội dung nhưng không có nút. Backend không trả TK ngân hàng của khách cho shop nên thân không hiện mục đó.
 */
export function VendorReturnDetail({ id }: { id: string }) {
  const { data: r, isPending, error } = useShopReturn(id);
  const now = useNow();
  const [dialog, setDialog] = useState<OpenDialog>(null);

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;
  if (isPending || !r) return <DetailSkeleton />;

  const status = returnStatusMeta(r);
  const step = stepInfo(r);
  const canDecide = r.status === "requested";
  const canReceive = r.status === "approved" && r.requireReturn;
  const hasAction = canDecide || canReceive;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={`Đổi trả đơn ${r.orderCode}`} description={`Gửi lúc ${formatDateTime(r.createdAt)}`}>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        <Button variant="outline" nativeButton={false} render={<Link href={ROUTES.vendor.returns} />}>
          <ArrowLeftIcon className="size-4" />
          <span className="hidden sm:inline">Danh sách</span>
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={`${ROUTES.vendor.orders}/${r.orderCode}`} />}>
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
        {hasAction ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <PermissionGate
              permission={PERMISSIONS.shopReturnProcess}
              fallback={<p className="text-xs text-muted-foreground">Bạn chỉ có quyền xem — liên hệ chủ shop để được cấp quyền xử lý đổi trả.</p>}
            >
              {canDecide ? (
                <>
                  <Button variant="destructive" onClick={() => setDialog("reject")}>
                    <XIcon className="size-4" />
                    Từ chối
                  </Button>
                  <Button onClick={() => setDialog("approve")}>
                    <CheckIcon className="size-4" />
                    Duyệt
                  </Button>
                </>
              ) : null}
              {canReceive ? (
                <Button onClick={() => setDialog("receive")}>
                  <PackageCheckIcon className="size-4" />
                  Đã nhận hàng
                </Button>
              ) : null}
            </PermissionGate>
          </div>
        ) : null}
      </div>

      <ReturnBody request={r} />

      <ReturnApproveDialog request={r} open={dialog === "approve"} onOpenChange={(o) => setDialog(o ? "approve" : null)} />
      <ReturnRejectDialog request={r} open={dialog === "reject"} onOpenChange={(o) => setDialog(o ? "reject" : null)} />
      <ReturnReceiveDialog request={r} open={dialog === "receive"} onOpenChange={(o) => setDialog(o ? "receive" : null)} />
    </div>
  );
}
