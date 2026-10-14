"use client";

import { useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/shared/form-message";
import { reasonSchema, type ReasonInput, type ReasonRule } from "@/features/shop/schemas/reason-schema";

/*
 * Hộp thoại nhập lý do / ghi chú cho thao tác phía sàn: khoá & từ chối shop (bắt
 * buộc lý do), duyệt & từ chối yêu cầu nộp quỹ. Màn cha chỉ mount khi có thao tác
 * nên ô nhập luôn trống khi mở — không cần reset trong effect.
 */
export function ReasonDialog({
  title,
  description,
  label,
  placeholder,
  confirmLabel,
  destructive = false,
  rule,
  pending,
  onSubmit,
  onClose,
}: {
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  destructive?: boolean;
  rule: ReasonRule;
  pending: boolean;
  onSubmit: (text: string) => void;
  onClose: () => void;
}) {
  const schema = useMemo(() => reasonSchema(rule), [rule]);
  const form = useForm<ReasonInput>({ resolver: zodResolver(schema), defaultValues: { text: "" } });
  const errors = form.formState.errors;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form id="reason-form" noValidate onSubmit={form.handleSubmit((input) => onSubmit(input.text))}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="reason-text">{label}</FieldLabel>
              <Textarea id="reason-text" rows={3} placeholder={placeholder} aria-invalid={!!errors.text} {...form.register("text")} />
              <FormMessage message={errors.text?.message} />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" form="reason-form" variant={destructive ? "destructive" : "default"} disabled={pending}>
            {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
