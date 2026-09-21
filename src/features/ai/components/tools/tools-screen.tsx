"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CopyIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/shared/form-message";
import { NativeSelect } from "@/components/shared/native-select";
import { GENDER_LABEL } from "@/lib/labels";
import { useAiClassify, useAiCopy } from "@/features/ai/hooks/use-ai-admin";
import { classifySchema, copySchema, type ClassifyInput, type CopyInput } from "@/features/ai/schemas/ai-schema";

const KIND_LABEL: Record<CopyInput["kind"], string> = {
  product_description: "Mô tả sản phẩm",
  review_reply: "Trả lời đánh giá",
  promotion_copy: "Nội dung khuyến mãi",
};

/*
 * Hai công cụ AI cho nhân viên (đồng bộ, không ghi DB): soạn nội dung (mô tả
 * sản phẩm / trả lời đánh giá / nội dung KM) và gợi ý phân loại sản phẩm mới.
 * Kết quả copy ra dán vào form tương ứng.
 */
export function ToolsScreen() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <CopyTool />
      <ClassifyTool />
    </div>
  );
}

function CopyTool() {
  const copy = useAiCopy();
  const [result, setResult] = useState<{ text: string; source: string } | null>(null);
  const form = useForm<CopyInput>({
    resolver: zodResolver(copySchema),
    defaultValues: { kind: "product_description", context: "", tone: "thân thiện, trẻ trung" },
  });
  const errors = form.formState.errors;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <SparklesIcon className="size-4 text-primary" />
          Soạn nội dung
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={form.handleSubmit((input) => copy.mutate({ ...input, tone: input.tone || undefined }, { onSuccess: setResult }))}>
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="cp-kind">Loại nội dung</FieldLabel>
                <NativeSelect id="cp-kind" {...form.register("kind")}>
                  {Object.entries(KIND_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="cp-tone">Giọng văn</FieldLabel>
                <Input id="cp-tone" placeholder="thân thiện, trẻ trung" {...form.register("tone")} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="cp-context">Ngữ cảnh</FieldLabel>
              <Textarea id="cp-context" rows={6} placeholder="Tên sản phẩm, chất liệu, điểm nổi bật… hoặc nội dung đánh giá / thông tin khuyến mãi" aria-invalid={!!errors.context} {...form.register("context")} />
              <FormMessage message={errors.context?.message} />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" disabled={copy.isPending}>
                {copy.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <SparklesIcon className="size-4" />}
                Soạn
              </Button>
            </div>
          </FieldGroup>
        </form>
        {result ? (
          <div className="mt-4 rounded-lg border bg-muted/40 p-3">
            <p className="text-sm whitespace-pre-wrap">{result.text}</p>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">Nguồn: {result.source}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(result.text);
                  toast.success("Đã sao chép.");
                }}
              >
                <CopyIcon className="size-3.5" />
                Sao chép
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ClassifyTool() {
  const classify = useAiClassify();
  const form = useForm<ClassifyInput>({
    resolver: zodResolver(classifySchema),
    defaultValues: { name: "", description: "", material: "" },
  });
  const errors = form.formState.errors;
  const r = classify.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <SparklesIcon className="size-4 text-primary" />
          Gợi ý phân loại sản phẩm mới
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={form.handleSubmit((input) => classify.mutate({ name: input.name, description: input.description || undefined, material: input.material || undefined }))}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="cl-name">Tên sản phẩm</FieldLabel>
              <Input id="cl-name" placeholder="Áo thun cotton oversize in chữ" aria-invalid={!!errors.name} {...form.register("name")} />
              <FormMessage message={errors.name?.message} />
            </Field>
            <Field>
              <FieldLabel htmlFor="cl-desc">Mô tả (tuỳ chọn)</FieldLabel>
              <Textarea id="cl-desc" rows={3} {...form.register("description")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="cl-material">Chất liệu (tuỳ chọn)</FieldLabel>
              <Input id="cl-material" {...form.register("material")} />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" disabled={classify.isPending}>
                {classify.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <SparklesIcon className="size-4" />}
                Gợi ý
              </Button>
            </div>
          </FieldGroup>
        </form>
        {r ? (
          <div className="mt-4 flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
            <p>
              Ngành hàng: <b>{r.categoryName ?? "—"}</b>{" "}
              {r.categorySlug ? <code className="font-mono text-xs text-muted-foreground">{r.categorySlug}</code> : null} · tin cậy {Math.round(r.confidence * 100)}%
            </p>
            <p>
              Giới: <b>{r.gender ? GENDER_LABEL[r.gender] : "—"}</b> · Chất liệu: <b>{r.material ?? "—"}</b>
            </p>
            {r.tags.length ? (
              <p className="flex flex-wrap items-center gap-1">
                Tag:
                {r.tags.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </p>
            ) : null}
            {r.alternatives.length ? <p className="text-xs text-muted-foreground">Có thể là: {r.alternatives.map((a) => a.categoryName).join(", ")}</p> : null}
            <p className="text-xs text-muted-foreground">Nguồn: {r.source}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
