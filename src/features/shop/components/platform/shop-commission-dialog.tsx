"use client";

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
import { FormMessage } from "@/components/shared/form-message";
import { useUpdateShopCommission } from "@/features/shop/hooks/use-admin-shops";
import { shopCommissionSchema, type ShopCommissionInput } from "@/features/shop/schemas/shop-commission-schema";
import type { ShopActionTarget } from "@/features/shop/types/admin-shop";

/*
 * Popup sửa tỉ lệ hoa hồng của một shop (PATCH /admin/shops/:id/commission) —
 * không hồi tố đơn cũ. Màn cha chỉ mount dialog khi có thao tác, nên `defaultValues`
 * luôn lấy đúng shop đang mở mà không cần reset trong effect.
 */
export function ShopCommissionDialog({ shop, onClose }: { shop: ShopActionTarget; onClose: () => void }) {
  const update = useUpdateShopCommission();
  const form = useForm<ShopCommissionInput>({
    resolver: zodResolver(shopCommissionSchema),
    defaultValues: { commissionRate: Number(shop.commissionRate) },
  });
  const errors = form.formState.errors;

  const submit = (input: ShopCommissionInput) =>
    update.mutate({ id: shop.id, commissionRate: input.commissionRate }, { onSuccess: onClose });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Sửa hoa hồng — {shop.name}</DialogTitle>
          <DialogDescription>Áp dụng cho đơn hàng MỚI kể từ lúc lưu, không hồi tố đơn cũ.</DialogDescription>
        </DialogHeader>
        <form id="shop-commission-form" noValidate onSubmit={form.handleSubmit(submit)}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="shop-commission">Tỉ lệ hoa hồng (%)</FieldLabel>
              <Input
                id="shop-commission"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step={0.01}
                aria-invalid={!!errors.commissionRate}
                {...form.register("commissionRate", { valueAsNumber: true })}
              />
              <FormMessage message={errors.commissionRate?.message} />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" form="shop-commission-form" disabled={update.isPending}>
            {update.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
