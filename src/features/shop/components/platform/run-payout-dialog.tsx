"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DetailList } from "@/components/shared/detail-list";
import { FormMessage } from "@/components/shared/form-message";
import { formatNumber, formatVnd, toDayString } from "@/lib/format";
import type { ShopPayoutResponse } from "@/lib/api/generated/model";
import { useRunPayout } from "@/features/shop/hooks/use-admin-payouts";
import { payoutRunSchema, type PayoutRunInput } from "@/features/shop/schemas/payout-run-schema";

/* Gợi ý mặc định: cả tháng trước — nhịp đối soát thường gặp; kế toán sửa lại nếu chạy kỳ khác. */
function lastMonthRange(): PayoutRunInput {
  const now = new Date();
  return {
    from: toDayString(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    to: toDayString(new Date(now.getFullYear(), now.getMonth(), 0)),
  };
}

/*
 * "Chạy kỳ đối soát": chọn từ ngày – đến ngày rồi gọi POST /admin/payouts/run. Đến
 * ngày tính hết ngày đó nhưng không vượt quá hiện tại (backend từ chối kỳ chưa kết
 * thúc). Thành công đổi sang màn tóm tắt kết quả (số kỳ, tổng thực chi) thay vì chỉ toast.
 */
export function RunPayoutDialog({ onClose }: { onClose: () => void }) {
  const run = useRunPayout();
  const [created, setCreated] = useState<ShopPayoutResponse[] | null>(null);
  // Khởi tạo lười để ngày mặc định tính một lần lúc mở, không đổi theo mỗi lần render.
  const [defaults] = useState(lastMonthRange);
  const [today] = useState(() => toDayString(new Date()));
  const form = useForm<PayoutRunInput>({ resolver: zodResolver(payoutRunSchema), defaultValues: defaults });
  const errors = form.formState.errors;

  const submit = (input: PayoutRunInput) => {
    const periodStart = new Date(`${input.from}T00:00:00`);
    const endOfDay = new Date(`${input.to}T23:59:59.999`);
    const now = new Date();
    const periodEnd = endOfDay > now ? now : endOfDay;
    run.mutate(
      { periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() },
      { onSuccess: (rows) => setCreated(rows) },
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {created ? (
          <RunResult created={created} onClose={onClose} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Chạy kỳ đối soát</DialogTitle>
              <DialogDescription>
                Sàn đã tự động chạy kỳ mỗi ngày — nút này để chạy bù. Tính cả đơn online (PayOS) và COD đã qua hạn đổi trả trong kỳ; trừ hoa hồng, tiền hoàn và nợ mang sang từ kỳ trước. Chạy lại cùng
                kỳ không tạo trùng, nhưng kỳ mới không được chồng lên kỳ đã chạy.
              </DialogDescription>
            </DialogHeader>
            <form id="run-payout-form" noValidate onSubmit={form.handleSubmit(submit)}>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="run-payout-from">Từ ngày</FieldLabel>
                  <Input id="run-payout-from" type="date" aria-invalid={!!errors.from} {...form.register("from")} />
                  <FormMessage message={errors.from?.message} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="run-payout-to">Đến ngày</FieldLabel>
                  <Input id="run-payout-to" type="date" max={today} aria-invalid={!!errors.to} {...form.register("to")} />
                  <FormMessage message={errors.to?.message} />
                </Field>
              </FieldGroup>
            </form>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Hủy
              </Button>
              <Button type="submit" form="run-payout-form" disabled={run.isPending}>
                {run.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
                Chạy đối soát
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* Tóm tắt các kỳ vừa tạo: tổng thực chi chỉ cộng kỳ có tiền phải chi (net > 0), kỳ âm là nợ mang sang. */
function RunResult({ created, onClose }: { created: ShopPayoutResponse[]; onClose: () => void }) {
  const toPay = created.filter((p) => Number(p.netPayout) > 0);
  const totalNet = toPay.reduce((sum, p) => sum + Number(p.netPayout), 0);
  const carried = created.filter((p) => p.status === "carried").length;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{created.length > 0 ? `Đã tạo ${formatNumber(created.length)} kỳ đối soát` : "Không có kỳ mới"}</DialogTitle>
        <DialogDescription>
          {created.length > 0
            ? "Danh sách kỳ đã được làm mới bên dưới — mở từng kỳ để xem dòng đơn và xử lý chi tiền."
            : "Không shop nào phát sinh đơn đủ điều kiện trong kỳ này, hoặc kỳ đã được chạy trước đó."}
        </DialogDescription>
      </DialogHeader>
      {created.length > 0 ? (
        <DetailList
          rows={[
            { label: "Số kỳ đã tạo", value: formatNumber(created.length) },
            { label: "Kỳ cần chi tiền", value: formatNumber(toPay.length) },
            { label: "Tổng thực chi", value: formatVnd(totalNet) },
            { label: "Kỳ mang nợ sang", value: formatNumber(carried) },
          ]}
        />
      ) : null}
      <DialogFooter>
        <Button onClick={onClose}>Xong</Button>
      </DialogFooter>
    </>
  );
}
