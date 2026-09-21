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
import { GENDER_LABEL } from "@/lib/labels";
import { useAdminCategories } from "@/features/catalog/hooks/use-categories";
import { useCreateProduct, useUpdateProduct } from "@/features/product/hooks/use-products";
import { productSchema, splitList, type ProductInput } from "@/features/product/schemas/product-schema";
import type { ProductAdminResponse } from "@/lib/api/generated/model";

/*
 * Form thông tin cơ bản của sản phẩm (tạo mới hoặc sửa). Biến thể + ảnh quản
 * lý ở tab riêng trong màn chi tiết (product-detail-screen) vì đi endpoint
 * riêng. Tạo xong chuyển sang chi tiết để thêm biến thể / ảnh rồi đăng bán.
 */
export function ProductForm({ product }: { product?: ProductAdminResponse }) {
  const router = useRouter();
  const { data: categories } = useAdminCategories();
  const create = useCreateProduct();
  const update = useUpdateProduct(product?.id ?? "");
  const pending = create.isPending || update.isPending;

  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          name: product.name,
          slug: product.slug,
          categoryId: product.categoryId,
          gender: product.gender as ProductInput["gender"],
          basePrice: Number(product.price.amount),
          listPrice: product.listPrice ? Number(product.listPrice.amount) : undefined,
          shortDescription: product.shortDescription ?? "",
          description: product.description ?? "",
          material: product.material ?? "",
          care: product.care.join("\n"),
          tags: product.tags.join(", "),
          isNew: product.isNew,
          isFeatured: product.isFeatured,
        }
      : {
          name: "",
          slug: "",
          categoryId: "",
          gender: "unisex",
          basePrice: 0,
          listPrice: undefined,
          shortDescription: "",
          description: "",
          material: "",
          care: "",
          tags: "",
          isNew: true,
          isFeatured: false,
        },
  });
  const errors = form.formState.errors;

  const submit = (input: ProductInput) => {
    const listPrice = input.listPrice && !Number.isNaN(input.listPrice) ? String(input.listPrice) : null;
    if (product) {
      update.mutate({
        name: input.name,
        slug: input.slug || undefined,
        categoryId: input.categoryId,
        gender: input.gender,
        basePrice: String(input.basePrice),
        listPrice,
        shortDescription: input.shortDescription || null,
        description: input.description || null,
        material: input.material || null,
        care: splitList(input.care),
        tags: splitList(input.tags),
        isNew: input.isNew,
        isFeatured: input.isFeatured,
      });
    } else {
      create.mutate(
        {
          name: input.name,
          slug: input.slug || undefined,
          categoryId: input.categoryId,
          gender: input.gender,
          basePrice: String(input.basePrice),
          listPrice,
          shortDescription: input.shortDescription || undefined,
          description: input.description || undefined,
          material: input.material || undefined,
          care: splitList(input.care),
          tags: splitList(input.tags),
          isNew: input.isNew,
          isFeatured: input.isFeatured,
        },
        { onSuccess: (created) => router.push(`${ROUTES.product.products}/${created.id}`) },
      );
    }
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(submit)} className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Thông tin cơ bản</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="p-name">Tên sản phẩm</FieldLabel>
              <Input id="p-name" aria-invalid={!!errors.name} {...form.register("name")} />
              <FormMessage message={errors.name?.message} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="p-slug">Slug (trống = tự sinh)</FieldLabel>
                <Input id="p-slug" aria-invalid={!!errors.slug} {...form.register("slug")} />
                <FormMessage message={errors.slug?.message} />
              </Field>
              <Field>
                <FieldLabel htmlFor="p-cat">Ngành hàng</FieldLabel>
                <NativeSelect id="p-cat" aria-invalid={!!errors.categoryId} {...form.register("categoryId")}>
                  <option value="">— Chọn —</option>
                  {(categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parentId ? "— " : ""}
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
                <FormMessage message={errors.categoryId?.message} />
              </Field>
              <Field>
                <FieldLabel htmlFor="p-gender">Giới</FieldLabel>
                <NativeSelect id="p-gender" {...form.register("gender")}>
                  {Object.entries(GENDER_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="p-short">Mô tả ngắn</FieldLabel>
              <Textarea id="p-short" rows={2} {...form.register("shortDescription")} />
              <FormMessage message={errors.shortDescription?.message} />
            </Field>
            <Field>
              <FieldLabel htmlFor="p-desc">Mô tả chi tiết</FieldLabel>
              <Textarea id="p-desc" rows={8} {...form.register("description")} />
              <FormMessage message={errors.description?.message} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="p-material">Chất liệu</FieldLabel>
                <Input id="p-material" placeholder="Cotton 100%" {...form.register("material")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="p-care">Hướng dẫn bảo quản (mỗi dòng một mục)</FieldLabel>
                <Textarea id="p-care" rows={3} placeholder={"Giặt máy nước lạnh\nKhông tẩy"} {...form.register("care")} />
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Giá & nhãn</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="p-price">Giá bán (VND)</FieldLabel>
                <Input id="p-price" type="number" min={0} step={1000} aria-invalid={!!errors.basePrice} {...form.register("basePrice", { valueAsNumber: true })} />
                <FormMessage message={errors.basePrice?.message} />
              </Field>
              <Field>
                <FieldLabel htmlFor="p-list">Giá gốc gạch (VND, trống = không giảm)</FieldLabel>
                <Input id="p-list" type="number" min={0} step={1000} aria-invalid={!!errors.listPrice} {...form.register("listPrice", { valueAsNumber: true })} />
                <FormMessage message={errors.listPrice?.message} />
              </Field>
              <Field>
                <FieldLabel htmlFor="p-tags">Tag (phẩy)</FieldLabel>
                <Input id="p-tags" placeholder="new, basic, summer" {...form.register("tags")} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.watch("isNew")} onCheckedChange={(v) => form.setValue("isNew", v)} />
                Gắn nhãn &quot;Mới&quot;
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.watch("isFeatured")} onCheckedChange={(v) => form.setValue("isFeatured", v)} />
                Sản phẩm nổi bật (trang chủ)
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
            {product ? "Lưu thay đổi" : "Tạo sản phẩm"}
          </Button>
        </div>
      </div>
    </form>
  );
}
