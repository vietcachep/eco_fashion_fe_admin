"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { NativeSelect } from "@/components/shared/native-select";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDateTime, formatVnd } from "@/lib/format";
import { useLiveCampaigns, useLiveCommands } from "../../hooks/use-livestream";
import type { LiveCampaign } from "../../types/live";
import {
  campaignSchema,
  type CampaignFormValues,
} from "../../schemas/campaign-schema";

const LABELS = {
  draft: "Chờ phiên bắt đầu",
  active: "Đang mở",
  closed: "Đã đóng nhận",
  revoked: "Đã thu hồi",
};
export function StudioCampaigns({
  sessionId,
  canManage,
  canCreate = canManage,
  platform = false,
}: {
  sessionId: string;
  canManage: boolean;
  canCreate?: boolean;
  platform?: boolean;
}) {
  const query = useLiveCampaigns(sessionId, platform);
  const commands = useLiveCommands();
  const [action, setAction] = useState<{
    campaign: LiveCampaign;
    action: "close" | "revoke";
  } | null>(null);
  const [creating, setCreating] = useState(false);
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Ưu đãi của phiên</h2>
          <p className="text-xs text-muted-foreground">
            {platform ? "Voucher sàn" : "Voucher shop"} · Hạn dùng 24 giờ từ khi
            bắt đầu live
          </p>
        </div>
        {canManage && canCreate ? (
          <Button variant="outline" onClick={() => setCreating(!creating)}>
            {creating ? "Đóng form" : "Tạo voucher live"}
          </Button>
        ) : null}
      </div>
      <p className="rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
        Mã chỉ áp dụng cho lượng hàng có nguồn từ phiên live. Huỷ/hoàn toàn bộ
        phạm vi được mã áp dụng thì xét khôi phục sau khi hoàn tiền xong, nếu
        còn hạn và chưa thu hồi. Hoàn một phần không trả lại cả mã; mã được khôi
        phục giữ hạn cũ và không giữ riêng lượt dùng.
      </p>
      {creating && canManage && canCreate ? (
        <CampaignForm
          sessionId={sessionId}
          platform={platform}
          onDone={() => setCreating(false)}
        />
      ) : null}
      {query.error ? (
        <ApiErrorState
          compact
          error={query.error}
          fallback="Không tải được ưu đãi."
        />
      ) : null}
      {commands.campaignAction.error ? (
        <ApiErrorState
          compact
          error={commands.campaignAction.error}
          fallback="Không thay đổi được ưu đãi."
        />
      ) : null}
      <div className="space-y-3">
        {query.isPending ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : null}
        {query.data?.map((c) => (
          <div
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
          >
            <div>
              <p className="text-xs font-semibold tracking-wide text-primary">
                {c.code}
              </p>
              <h3 className="mt-1 text-sm font-medium">{c.name}</h3>
              <p className="text-xs text-muted-foreground">
                {c.type === "percentage"
                  ? `${c.value}%`
                  : c.type === "free_shipping"
                    ? "Miễn phí vận chuyển theo điều kiện"
                    : formatVnd(c.value)}{" "}
                · {LABELS[c.state]}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Đã nhận {c.claimedCount}
                {c.claimLimit ? `/${c.claimLimit}` : ""} · Đã dùng {c.usedCount}
                {c.usageLimit ? `/${c.usageLimit}` : ""} · Hết hạn{" "}
                {formatDateTime(c.redeemUntil)}
              </p>
            </div>
            {canManage && c.state !== "revoked" ? (
              <div className="flex flex-wrap gap-2">
                {c.state !== "closed" && !platform ? (
                  <Button
                    variant="outline"
                    disabled={commands.campaignAction.isPending}
                    onClick={() => setAction({ campaign: c, action: "close" })}
                  >
                    Đóng nhận
                  </Button>
                ) : null}
                <Button
                  variant="destructive"
                  disabled={commands.campaignAction.isPending}
                  onClick={() => setAction({ campaign: c, action: "revoke" })}
                >
                  Thu hồi
                </Button>
              </div>
            ) : null}
          </div>
        ))}
        {!query.isPending && !query.data?.length ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Phiên chưa có voucher live.
          </p>
        ) : null}
      </div>
      <ConfirmDialog
        open={!!action}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
        title={
          action?.action === "close" ? "Đóng nhận voucher?" : "Thu hồi voucher?"
        }
        description={
          action?.action === "close"
            ? "Khách chưa nhận không thể nhận thêm; các mã đã nhận vẫn được dùng nếu còn đủ điều kiện."
            : "Các mã chưa dùng sẽ không còn áp dụng. Đơn đã tạo giữ nguyên quyền lợi và được xử lý qua luồng đơn hàng."
        }
        destructive={action?.action === "revoke"}
        confirmLabel={action?.action === "close" ? "Đóng nhận" : "Thu hồi mã"}
        onConfirm={() => {
          if (action)
            commands.campaignAction.mutate({
              id: sessionId,
              campaignId: action.campaign.id,
              action: action.action,
              platform,
              reason:
                action.action === "close"
                  ? "Shop đóng nhận ưu đãi"
                  : "Shop thu hồi ưu đãi",
            });
        }}
      />
    </section>
  );
}
function CampaignForm({
  sessionId,
  onDone,
  platform,
}: {
  sessionId: string;
  onDone: () => void;
  platform: boolean;
}) {
  const commands = useLiveCommands();
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      code: "",
      name: "",
      type: "percentage",
      value: 10,
      minOrderAmount: "0",
      maxDiscount: "",
      claimLimit: 10,
      usageLimit: 10,
    },
  });
  const submit = form.handleSubmit((v) =>
    commands.createCampaign.mutate(
      {
        id: sessionId,
        platform,
        data: {
          ...v,
          value: v.type === "free_shipping" ? 0 : v.value,
          maxDiscount: v.maxDiscount || undefined,
        },
      },
      { onSuccess: onDone },
    ),
  );
  return (
    <form
      className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2"
      onSubmit={(e) => void submit(e)}
    >
      {(
        [
          ["code", "Mã voucher"],
          ["name", "Tên ưu đãi"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="space-y-1 text-sm">
          {label}
          <Input {...form.register(key)} />
          {form.formState.errors[key] ? (
            <span className="text-xs text-destructive">
              {form.formState.errors[key]?.message}
            </span>
          ) : null}
        </label>
      ))}
      <label className="space-y-1 text-sm">
        Loại
        <NativeSelect {...form.register("type")}>
          <option value="percentage">Giảm phần trăm</option>
          <option value="fixed_amount">Giảm số tiền</option>
          <option value="free_shipping">Miễn phí vận chuyển</option>
        </NativeSelect>
      </label>
      <label className="space-y-1 text-sm">
        Giá trị giảm
        <Input
          type="number"
          min={0}
          {...form.register("value", { valueAsNumber: true })}
        />
        {form.formState.errors.value ? (
          <span className="text-xs text-destructive">
            {form.formState.errors.value.message}
          </span>
        ) : null}
      </label>
      <label className="space-y-1 text-sm">
        Giá trị hàng tối thiểu (VND)
        <Input inputMode="numeric" {...form.register("minOrderAmount")} />
      </label>
      <label className="space-y-1 text-sm">
        Giảm tối đa (VND, để trống nếu không giới hạn)
        <Input inputMode="numeric" {...form.register("maxDiscount")} />
      </label>
      <label className="space-y-1 text-sm">
        Tối đa lượt nhận
        <Input
          type="number"
          min={1}
          {...form.register("claimLimit", { valueAsNumber: true })}
        />
      </label>
      <label className="space-y-1 text-sm">
        Tối đa lượt dùng
        <Input
          type="number"
          min={1}
          {...form.register("usageLimit", { valueAsNumber: true })}
        />
      </label>
      {Object.keys(form.formState.errors).length ? (
        <ul
          className="space-y-1 text-xs text-destructive sm:col-span-2"
          role="alert"
        >
          {Object.entries(form.formState.errors).map(([key, e]) => (
            <li key={key}>{e?.message}</li>
          ))}
        </ul>
      ) : null}
      {commands.createCampaign.error ? (
        <div className="sm:col-span-2">
          <ApiErrorState
            compact
            error={commands.createCampaign.error}
            fallback="Không tạo được voucher."
          />
        </div>
      ) : null}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="submit" disabled={commands.createCampaign.isPending}>
          Tạo voucher
        </Button>
      </div>
    </form>
  );
}
