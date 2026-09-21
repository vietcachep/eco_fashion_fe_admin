"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, CheckIcon, ImageIcon, Loader2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { DetailList } from "@/components/shared/detail-list";
import { FormMessage } from "@/components/shared/form-message";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { formatDateTime, formatNumber, formatVnd } from "@/lib/format";
import { RETURN_STATUS, statusMeta } from "@/lib/labels";
import { useAdminReturn, useProcessReturn } from "@/features/order/hooks/use-orders";
import { processReturnSchema, type ProcessReturnInput } from "@/features/order/schemas/order-schema";

const LOAD_ERROR = "Không tải được yêu cầu đổi trả.";

/*
 * Chi tiết đổi trả: hàng trả, lý do, minh chứng ảnh/video của khách. Nhân
 * viên duyệt (kèm số tiền hoàn ghi đè, mặc định = tổng dòng trả) hoặc từ
 * chối (kèm lý do). Duyệt xong backend tạo yêu cầu hoàn tiền cho kế toán.
 */
export function ReturnDetail({ id }: { id: string }) {
  const { data: r, isPending, error } = useAdminReturn(id);
  const process = useProcessReturn(id);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);

  const form = useForm<ProcessReturnInput>({
    resolver: zodResolver(processReturnSchema),
    defaultValues: { decision: "approved", rejectReason: "", refundAmount: undefined },
  });
  const errors = form.formState.errors;

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;
  if (isPending || !r) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  const status = statusMeta(RETURN_STATUS, r.status);
  const open = (d: "approved" | "rejected") => {
    form.reset({ decision: d, rejectReason: "", refundAmount: d === "approved" ? Number(r.refundAmount.amount) : undefined });
    setDecision(d);
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={`Đổi trả đơn ${r.orderCode}`} description={`Gửi lúc ${formatDateTime(r.createdAt)}`}>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        <Button variant="outline" nativeButton={false} render={<Link href={ROUTES.order.returns} />}>
          <ArrowLeftIcon className="size-4" />
          Danh sách
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={`${ROUTES.order.orders}/${r.orderCode}`} />}>
          Xem đơn
        </Button>
        {r.status === "requested" ? (
          <PermissionGate permission={PERMISSIONS.returnProcess}>
            <Button variant="destructive" onClick={() => open("rejected")}>
              <XIcon className="size-4" />
              Từ chối
            </Button>
            <Button onClick={() => open("approved")}>
              <CheckIcon className="size-4" />
              Duyệt
            </Button>
          </PermissionGate>
        ) : null}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
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
                  <p className="text-xs text-muted-foreground">
                    {it.color} · {it.size}
                  </p>
                </div>
                <span>× {formatNumber(it.quantity)}</span>
              </div>
            ))}
            {r.evidence.length ? (
              <div>
                <p className="pb-2 text-xs font-medium text-muted-foreground">Minh chứng của khách</p>
                <div className="flex flex-wrap gap-2">
                  {r.evidence.map((m, i) => (
                    <a key={i} href={m.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border">
                      {m.type === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element -- ảnh động
                        <img src={m.url} alt={m.name} className="size-24 object-cover" />
                      ) : (
                        <span className="flex size-24 items-center justify-center text-xs">Video</span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông tin</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList
              rows={[
                { label: "Lý do", value: r.reason },
                { label: "Chi tiết", value: r.detail || "—" },
                { label: "Hoàn tiền", value: r.refundAmount.display },
                { label: "Lý do từ chối", value: r.rejectReason || "—" },
                { label: "Xử lý lúc", value: formatDateTime(r.processedAt) },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!decision} onOpenChange={(o) => !o && setDecision(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{decision === "approved" ? "Duyệt đổi trả" : "Từ chối đổi trả"}</DialogTitle>
            <DialogDescription>
              {decision === "approved"
                ? "Tạo yêu cầu hoàn tiền cho kế toán; đơn chuyển sang trạng thái trả hàng."
                : "Khách nhận thông báo kèm lý do."}
            </DialogDescription>
          </DialogHeader>
          <form
            id="return-form"
            noValidate
            onSubmit={form.handleSubmit((input) =>
              process.mutate(
                {
                  decision: input.decision,
                  rejectReason: input.decision === "rejected" ? input.rejectReason : undefined,
                  refundAmount:
                    input.decision === "approved" && input.refundAmount && !Number.isNaN(input.refundAmount)
                      ? String(input.refundAmount)
                      : undefined,
                },
                { onSuccess: () => setDecision(null) },
              ),
            )}
          >
            <FieldGroup className="gap-4">
              {decision === "approved" ? (
                <Field>
                  <FieldLabel htmlFor="rt-amount">Số tiền hoàn (VND)</FieldLabel>
                  <Input id="rt-amount" type="number" min={0} step={1000} aria-invalid={!!errors.refundAmount} {...form.register("refundAmount", { valueAsNumber: true })} />
                  <p className="text-xs text-muted-foreground">Mặc định {formatVnd(r.refundAmount.amount)} = tổng dòng trả.</p>
                  <FormMessage message={errors.refundAmount?.message} />
                </Field>
              ) : (
                <Field>
                  <FieldLabel htmlFor="rt-reason">Lý do từ chối</FieldLabel>
                  <Textarea id="rt-reason" rows={3} aria-invalid={!!errors.rejectReason} {...form.register("rejectReason")} />
                  <FormMessage message={errors.rejectReason?.message} />
                </Field>
              )}
            </FieldGroup>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecision(null)}>
              Hủy
            </Button>
            <Button type="submit" form="return-form" variant={decision === "rejected" ? "destructive" : "default"} disabled={process.isPending}>
              {process.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {decision === "approved" ? "Duyệt" : "Từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
