"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { InfoIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/shared/form-message";
import { NativeSelect } from "@/components/shared/native-select";
import { apiErrorCode, apiErrorMessage } from "@/lib/api-error";
import { ROUTES } from "@/lib/constants";
import { toLocalInput } from "@/lib/format";
import { APPLIES_TO_LABEL, PROMO_TYPE_LABEL } from "@/lib/labels";
import { useCreateShopPromotion, useUpdateShopPromotion } from "@/features/promotion/hooks/use-shop-promotions";
import { buildShopPromotionBody, shopPromotionSchema, type ShopPromotionInput } from "@/features/promotion/schemas/shop-promotion-schema";
import type { PromotionAdminResponse } from "@/features/promotion/types/promotion";
import { PromotionTargetPicker } from "@/features/promotion/components/vendor/promotion-target-picker";

/* Ô số tuỳ chọn: để trống → undefined (khớp `z.number().optional()`), khác với valueAsNumber trả NaN. */
const optionalNumber = (v: unknown) => (v === "" || v === null || v === undefined ? undefined : Number(v));

function defaultsOf(promotion?: PromotionAdminResponse): ShopPromotionInput {
  if (promotion) {
    return {
      code: promotion.code,
      name: promotion.name ?? "",
      description: promotion.description ?? "",
      type: promotion.type as ShopPromotionInput["type"],
      value:
        promotion.type === "percentage" ? (promotion.percentValue ?? 0) : promotion.type === "fixed_amount" ? Number(promotion.displayValue?.amount ?? 0) : 0,
      maxDiscount: promotion.displayMaxDiscount ? Number(promotion.displayMaxDiscount.amount) : undefined,
      minOrderAmount: promotion.displayMinOrderAmount ? Number(promotion.displayMinOrderAmount.amount) : undefined,
      usageLimit: promotion.usageLimit ?? undefined,
      usageLimitPerUser: promotion.usageLimitPerUser ?? undefined,
      appliesTo: promotion.appliesTo as ShopPromotionInput["appliesTo"],
      targets: promotion.targets.map((t) => t.targetRef),
      startsAt: toLocalInput(promotion.startAt),
      endsAt: toLocalInput(promotion.endAt),
      isActive: promotion.isActive,
      isPublic: promotion.isPublic,
    };
  }
  return {
    code: "",
    name: "",
    description: "",
    type: "percentage",
    value: 10,
    maxDiscount: undefined,
    minOrderAmount: undefined,
    usageLimit: undefined,
    usageLimitPerUser: undefined,
    appliesTo: "all",
    targets: [],
    startsAt: toLocalInput(new Date().toISOString()),
    endsAt: toLocalInput(new Date(Date.now() + 30 * 86_400_000).toISOString()),
    isActive: true,
    isPublic: true,
  };
}

/*
 * Form tạo / sửa mã giảm giá của gian hàng. Mã scope=shop do SHOP chịu chi phí và
 * chỉ áp cho đơn con của shop; mỗi đơn con dùng tối đa 1 mã sàn + 1 mã shop. Mã
 * không sửa được sau khi tạo. Có `promotion` = chế độ sửa (nút "Hủy" gọi `onCancel`).
 */
export function VendorPromotionForm({ promotion, onCancel }: { promotion?: PromotionAdminResponse; onCancel?: () => void }) {
  const router = useRouter();
  const create = useCreateShopPromotion();
  const update = useUpdateShopPromotion();
  const pending = create.isPending || update.isPending;
  const [serverError, setServerError] = useState<string | null>(null);
  const [defaultValues] = useState(() => defaultsOf(promotion));

  const form = useForm<ShopPromotionInput>({ resolver: zodResolver(shopPromotionSchema), defaultValues });
  const errors = form.formState.errors;
  const type = useWatch({ control: form.control, name: "type" });
  const appliesTo = useWatch({ control: form.control, name: "appliesTo" });
  const targets = useWatch({ control: form.control, name: "targets" });
  const isActive = useWatch({ control: form.control, name: "isActive" });
  const isPublic = useWatch({ control: form.control, name: "isPublic" });
  const appliesReg = form.register("appliesTo");

  const onError = (e: unknown) => {
    if (apiErrorCode(e) === "PROMOTION_CODE_EXISTS") {
      form.setError("code", { message: "Mã này đã được dùng — hãy chọn mã khác." });
      return;
    }
    setServerError(apiErrorMessage(e, "Lưu mã giảm giá thất bại."));
  };

  const submit = (input: ShopPromotionInput) => {
    setServerError(null);
    const body = buildShopPromotionBody(input);
    if (promotion) {
      update.mutate({ id: promotion.id, body }, { onSuccess: () => onCancel?.(), onError });
    } else {
      create.mutate(
        { ...body, code: input.code.toUpperCase() },
        { onSuccess: (p) => router.push(`${ROUTES.vendor.promotions}/${p.id}`), onError },
      );
    }
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(submit)} className="grid gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mã & mức giảm</CardTitle>
            <CardDescription>
              Mã do gian hàng của bạn chịu chi phí giảm giá và chỉ áp cho đơn hàng của shop. Mỗi đơn dùng tối đa 1 mã sàn + 1 mã gian hàng.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-4">
              {promotion && promotion.usedCount > 0 ? (
                <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
                  Mã đã có {promotion.usedCount} lượt dùng — thay đổi chỉ áp dụng cho các đơn đặt sau khi lưu.
                </p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="vp-code">Mã (khách nhập)</FieldLabel>
                  <Input
                    id="vp-code"
                    className="font-mono uppercase"
                    placeholder="SHOP10"
                    maxLength={40}
                    autoComplete="off"
                    disabled={!!promotion}
                    aria-invalid={!!errors.code}
                    {...form.register("code")}
                  />
                  <FormMessage message={errors.code?.message} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="vp-name">Tên hiển thị</FieldLabel>
                  <Input id="vp-name" placeholder="Giảm 10% cho đơn từ 500k" aria-invalid={!!errors.name} {...form.register("name")} />
                  <FormMessage message={errors.name?.message} />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="vp-desc">Mô tả (tuỳ chọn)</FieldLabel>
                <Textarea id="vp-desc" rows={2} maxLength={500} aria-invalid={!!errors.description} {...form.register("description")} />
                <FormMessage message={errors.description?.message} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="vp-type">Loại giảm giá</FieldLabel>
                  <NativeSelect id="vp-type" {...form.register("type")}>
                    {Object.entries(PROMO_TYPE_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                {type !== "free_shipping" ? (
                  <Field>
                    <FieldLabel htmlFor="vp-value">{type === "percentage" ? "Giảm (%)" : "Giảm (VND)"}</FieldLabel>
                    <Input
                      id="vp-value"
                      type="number"
                      inputMode="numeric"
                      min={type === "percentage" ? 1 : 1000}
                      max={type === "percentage" ? 100 : undefined}
                      step={type === "percentage" ? 1 : 1000}
                      aria-invalid={!!errors.value}
                      {...form.register("value", { valueAsNumber: true })}
                    />
                    <FormMessage message={errors.value?.message} />
                  </Field>
                ) : null}
                {type === "percentage" ? (
                  <Field>
                    <FieldLabel htmlFor="vp-max">Giảm tối đa (VND)</FieldLabel>
                    <Input
                      id="vp-max"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1000}
                      placeholder="Không giới hạn"
                      aria-invalid={!!errors.maxDiscount}
                      {...form.register("maxDiscount", { setValueAs: optionalNumber })}
                    />
                    <FormMessage message={errors.maxDiscount?.message} />
                  </Field>
                ) : null}
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Điều kiện & hạn mức</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="vp-min">Đơn tối thiểu (VND)</FieldLabel>
                  <Input
                    id="vp-min"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1000}
                    placeholder="Không yêu cầu"
                    aria-invalid={!!errors.minOrderAmount}
                    {...form.register("minOrderAmount", { setValueAs: optionalNumber })}
                  />
                  <FormMessage message={errors.minOrderAmount?.message} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="vp-limit">Tổng lượt dùng</FieldLabel>
                  <Input
                    id="vp-limit"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    placeholder="Không giới hạn"
                    aria-invalid={!!errors.usageLimit}
                    {...form.register("usageLimit", { setValueAs: optionalNumber })}
                  />
                  <FormMessage message={errors.usageLimit?.message} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="vp-limit-user">Lượt / khách</FieldLabel>
                  <Input
                    id="vp-limit-user"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    placeholder="Không giới hạn"
                    aria-invalid={!!errors.usageLimitPerUser}
                    {...form.register("usageLimitPerUser", { setValueAs: optionalNumber })}
                  />
                  <FormMessage message={errors.usageLimitPerUser?.message} />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="vp-applies">Phạm vi áp dụng</FieldLabel>
                <NativeSelect
                  id="vp-applies"
                  {...appliesReg}
                  onChange={(e) => {
                    void appliesReg.onChange(e);
                    // Slug ngành và id sản phẩm không dùng chung được → đổi kiểu thì làm trống danh sách đã chọn.
                    form.setValue("targets", [], { shouldValidate: form.formState.isSubmitted });
                  }}
                >
                  {Object.entries(APPLIES_TO_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {k === "all" ? "Toàn bộ sản phẩm của shop" : v}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              {appliesTo !== "all" ? (
                <Field>
                  <FieldLabel>{appliesTo === "category" ? "Ngành hàng áp dụng" : "Sản phẩm áp dụng"}</FieldLabel>
                  <PromotionTargetPicker
                    key={appliesTo}
                    kind={appliesTo}
                    value={targets}
                    onChange={(next) => form.setValue("targets", next, { shouldValidate: form.formState.isSubmitted })}
                    invalid={!!errors.targets}
                  />
                  <FormMessage message={errors.targets?.message} />
                </Field>
              ) : null}
            </FieldGroup>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thời gian & hiển thị</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="vp-start">Bắt đầu</FieldLabel>
                <Input id="vp-start" type="datetime-local" aria-invalid={!!errors.startsAt} {...form.register("startsAt")} />
                <FormMessage message={errors.startsAt?.message} />
              </Field>
              <Field>
                <FieldLabel htmlFor="vp-end">Kết thúc</FieldLabel>
                <Input id="vp-end" type="datetime-local" aria-invalid={!!errors.endsAt} {...form.register("endsAt")} />
                <FormMessage message={errors.endsAt?.message} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={isActive} onCheckedChange={(v) => form.setValue("isActive", v)} />
                Đang bật
              </label>
              <label className="flex items-start gap-2 text-sm">
                <Switch className="mt-0.5" checked={isPublic} onCheckedChange={(v) => form.setValue("isPublic", v)} />
                <span>Gợi ý ở giỏ hàng khi khách mua shop bạn (tắt = khách phải nhập mã)</span>
              </label>
            </FieldGroup>
          </CardContent>
        </Card>

        {serverError ? (
          <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {serverError}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => (onCancel ? onCancel() : router.push(ROUTES.vendor.promotions))}>
            Hủy
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {promotion ? "Lưu thay đổi" : "Tạo mã"}
          </Button>
        </div>
      </div>
    </form>
  );
}
