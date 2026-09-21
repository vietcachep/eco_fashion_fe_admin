"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/shared/form-message";
import { NativeSelect } from "@/components/shared/native-select";
import { ROUTES } from "@/lib/constants";
import { fromLocalInput, toLocalInput } from "@/lib/format";
import { APPLIES_TO_LABEL, PROMO_TYPE_LABEL } from "@/lib/labels";
import { useCreatePromotion, useUpdatePromotion } from "@/features/promotion/hooks/use-promotions";
import { promotionSchema, type PromotionInput } from "@/features/promotion/schemas/promotion-schema";
import type { PromotionAdminResponse } from "@/features/promotion/types/promotion";

const num = (v: number | undefined) => (v !== undefined && !Number.isNaN(v) ? v : undefined);

/*
 * Form tạo / sửa mã khuyến mãi. Mã không sửa được sau khi tạo (khách đã dùng).
 * Phạm vi: toàn đơn / ngành hàng (slug) / sản phẩm (id) — mỗi dòng một mục.
 */
export function PromotionForm({ promotion, initial }: { promotion?: PromotionAdminResponse; initial?: Partial<PromotionInput> }) {
  const router = useRouter();
  const create = useCreatePromotion();
  const update = useUpdatePromotion(promotion?.id ?? "");
  const pending = create.isPending || update.isPending;

  const form = useForm<PromotionInput>({
    resolver: zodResolver(promotionSchema),
    defaultValues: promotion
      ? {
          code: promotion.code,
          name: promotion.name ?? "",
          description: promotion.description ?? "",
          type: promotion.type as PromotionInput["type"],
          value: promotion.type === "percentage" ? (promotion.percentValue ?? 0) : Number(promotion.displayValue?.amount ?? 0),
          maxDiscount: promotion.displayMaxDiscount ? Number(promotion.displayMaxDiscount.amount) : undefined,
          minOrderAmount: promotion.displayMinOrderAmount ? Number(promotion.displayMinOrderAmount.amount) : undefined,
          usageLimit: promotion.usageLimit ?? undefined,
          usageLimitPerUser: promotion.usageLimitPerUser ?? undefined,
          appliesTo: promotion.appliesTo as PromotionInput["appliesTo"],
          targets: promotion.targets.map((t) => t.targetRef).join("\n"),
          startsAt: toLocalInput(promotion.startAt),
          endsAt: toLocalInput(promotion.endAt),
          isActive: promotion.isActive,
          isPublic: promotion.isPublic,
        }
      : {
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
          targets: "",
          startsAt: toLocalInput(new Date().toISOString()),
          endsAt: toLocalInput(new Date(Date.now() + 30 * 86_400_000).toISOString()),
          isActive: true,
          isPublic: true,
          ...initial,
        },
  });
  const errors = form.formState.errors;
  const type = form.watch("type");
  const appliesTo = form.watch("appliesTo");

  const submit = (input: PromotionInput) => {
    const targets =
      input.appliesTo === "all"
        ? []
        : input.targets
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean)
            .map((ref) => ({ targetType: input.appliesTo as "category" | "product", targetRef: ref }));
    const body = {
      name: input.name,
      description: input.description || null,
      type: input.type,
      value: input.type === "free_shipping" ? "0" : String(input.value),
      maxDiscount: input.type === "percentage" && num(input.maxDiscount) ? String(input.maxDiscount) : null,
      minOrderAmount: num(input.minOrderAmount) !== undefined ? String(input.minOrderAmount) : "0",
      usageLimit: num(input.usageLimit) ?? null,
      usageLimitPerUser: num(input.usageLimitPerUser) ?? null,
      appliesTo: input.appliesTo,
      targets,
      startsAt: fromLocalInput(input.startsAt)!,
      endsAt: fromLocalInput(input.endsAt)!,
      isActive: input.isActive,
      isPublic: input.isPublic,
    };
    if (promotion) update.mutate(body, { onSuccess: () => router.push(`${ROUTES.promotion.promotions}/${promotion.id}`) });
    else create.mutate({ ...body, code: input.code }, { onSuccess: (p) => router.push(`${ROUTES.promotion.promotions}/${p.id}`) });
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(submit)} className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Mã & mức giảm</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="pr-code">Mã (khách nhập)</FieldLabel>
                <Input id="pr-code" className="font-mono uppercase" placeholder="FREESHIP" disabled={!!promotion} aria-invalid={!!errors.code} {...form.register("code")} />
                <FormMessage message={errors.code?.message} />
              </Field>
              <Field>
                <FieldLabel htmlFor="pr-name">Tên hiển thị</FieldLabel>
                <Input id="pr-name" placeholder="Miễn phí vận chuyển đơn từ 300k" aria-invalid={!!errors.name} {...form.register("name")} />
                <FormMessage message={errors.name?.message} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="pr-desc">Mô tả</FieldLabel>
              <Textarea id="pr-desc" rows={2} {...form.register("description")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="pr-type">Loại</FieldLabel>
                <NativeSelect id="pr-type" {...form.register("type")}>
                  {Object.entries(PROMO_TYPE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              {type !== "free_shipping" ? (
                <Field>
                  <FieldLabel htmlFor="pr-value">{type === "percentage" ? "Giảm (%)" : "Giảm (VND)"}</FieldLabel>
                  <Input id="pr-value" type="number" min={0} step={type === "percentage" ? 1 : 1000} aria-invalid={!!errors.value} {...form.register("value", { valueAsNumber: true })} />
                  <FormMessage message={errors.value?.message} />
                </Field>
              ) : null}
              {type === "percentage" ? (
                <Field>
                  <FieldLabel htmlFor="pr-max">Giảm tối đa (VND)</FieldLabel>
                  <Input id="pr-max" type="number" min={0} step={1000} {...form.register("maxDiscount", { valueAsNumber: true })} />
                </Field>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="pr-min">Đơn tối thiểu (VND)</FieldLabel>
                <Input id="pr-min" type="number" min={0} step={1000} {...form.register("minOrderAmount", { valueAsNumber: true })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="pr-limit">Tổng lượt dùng (trống = không giới hạn)</FieldLabel>
                <Input id="pr-limit" type="number" min={1} {...form.register("usageLimit", { valueAsNumber: true })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="pr-limit-user">Lượt / khách</FieldLabel>
                <Input id="pr-limit-user" type="number" min={1} {...form.register("usageLimitPerUser", { valueAsNumber: true })} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="pr-applies">Phạm vi áp dụng</FieldLabel>
                <NativeSelect id="pr-applies" {...form.register("appliesTo")}>
                  {Object.entries(APPLIES_TO_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              {appliesTo !== "all" ? (
                <Field>
                  <FieldLabel htmlFor="pr-targets">{appliesTo === "category" ? "Slug ngành hàng (mỗi dòng một)" : "ID sản phẩm (mỗi dòng một)"}</FieldLabel>
                  <Textarea id="pr-targets" rows={3} aria-invalid={!!errors.targets} {...form.register("targets")} />
                  <FormMessage message={errors.targets?.message} />
                </Field>
              ) : null}
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thời gian & hiển thị</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="pr-start">Bắt đầu</FieldLabel>
                <Input id="pr-start" type="datetime-local" aria-invalid={!!errors.startsAt} {...form.register("startsAt")} />
                <FormMessage message={errors.startsAt?.message} />
              </Field>
              <Field>
                <FieldLabel htmlFor="pr-end">Kết thúc</FieldLabel>
                <Input id="pr-end" type="datetime-local" aria-invalid={!!errors.endsAt} {...form.register("endsAt")} />
                <FormMessage message={errors.endsAt?.message} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.watch("isActive")} onCheckedChange={(v) => form.setValue("isActive", v)} />
                Đang bật
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.watch("isPublic")} onCheckedChange={(v) => form.setValue("isPublic", v)} />
                Hiện gợi ý ở giỏ hàng (tắt = khách phải nhập tay)
              </label>
            </FieldGroup>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Hủy
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {promotion ? "Lưu" : "Tạo mã"}
          </Button>
        </div>
      </div>
    </form>
  );
}
