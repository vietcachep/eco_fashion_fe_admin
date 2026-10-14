"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/shared/form-message";
import { apiErrorMessage } from "@/lib/api-error";
import type { ShopReviewResponse } from "@/lib/api/generated/model";
import { useReplyShopReview } from "@/features/review/hooks/use-shop-reviews";
import { shopReviewReplySchema, type ShopReviewReplyInput } from "@/features/review/schemas/shop-review-reply-schema";
import { ReviewStars } from "@/features/review/components/common/review-stars";

/*
 * Trả lời / sửa phản hồi một đánh giá của sản phẩm thuộc shop. Phản hồi hiển thị
 * CÔNG KHAI dưới tên gian hàng (backend lưu tên shop, không phải tên người gõ).
 * Thân dialog tách riêng + `key={review.id}` để mỗi đánh giá có form sạch, không
 * phải reset state bằng effect.
 */
export function VendorReplyDialog({ review, onClose }: { review: ShopReviewResponse | null; onClose: () => void }) {
  return (
    <Dialog open={!!review} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">{review ? <ReplyBody key={review.id} review={review} onClose={onClose} /> : null}</DialogContent>
    </Dialog>
  );
}

function ReplyBody({ review, onClose }: { review: ShopReviewResponse; onClose: () => void }) {
  const reply = useReplyShopReview();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<ShopReviewReplyInput>({
    resolver: zodResolver(shopReviewReplySchema),
    defaultValues: { content: review.reply?.content ?? "" },
  });
  const length = useWatch({ control: form.control, name: "content" }).length;

  const submit = (input: ShopReviewReplyInput) => {
    setServerError(null);
    reply.mutate({ id: review.id, content: input.content }, { onSuccess: onClose, onError: (e) => setServerError(apiErrorMessage(e, "Gửi phản hồi thất bại.")) });
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{review.reply ? "Sửa phản hồi" : "Trả lời đánh giá"}</DialogTitle>
        <DialogDescription>Phản hồi hiển thị công khai dưới tên gian hàng của bạn.</DialogDescription>
      </DialogHeader>

      <div className="rounded-lg border bg-muted/40 p-3 text-sm">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <ReviewStars rating={review.rating} />
          <span className="font-medium">{review.authorDisplay}</span>
          <span className="text-muted-foreground">· {review.productName}</span>
        </p>
        <p className="mt-1.5 whitespace-pre-wrap">{review.content}</p>
      </div>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="vr-content">Nội dung phản hồi</FieldLabel>
          <Textarea
            id="vr-content"
            rows={5}
            maxLength={1000}
            placeholder="Cảm ơn bạn đã mua hàng và để lại đánh giá…"
            aria-invalid={!!form.formState.errors.content}
            {...form.register("content")}
          />
          <div className="flex items-start justify-between gap-2">
            <FormMessage message={form.formState.errors.content?.message} />
            <span className="ml-auto text-xs text-muted-foreground">{length}/1000</span>
          </div>
        </Field>
      </FieldGroup>

      {serverError ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {serverError}
        </div>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" disabled={reply.isPending}>
          {reply.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {review.reply ? "Lưu phản hồi" : "Gửi phản hồi"}
        </Button>
      </DialogFooter>
    </form>
  );
}
