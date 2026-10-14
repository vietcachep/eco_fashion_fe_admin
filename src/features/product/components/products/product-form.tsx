"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { type FieldError, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { FormMessage } from "@/components/shared/form-message";
import { NativeSelect } from "@/components/shared/native-select";
import { apiErrorCode, apiMessage } from "@/lib/api-error";
import { GENDER_LABEL } from "@/lib/labels";
import type { AttributeValueInput, ProductAdminResponse } from "@/lib/api/generated/model";
import { useProductScope } from "@/features/product/hooks/use-product-scope";
import {
  resolveProductCategory,
  useCategoryTemplate,
  useProductCategories,
} from "@/features/product/hooks/use-product-catalog";
import { useCreateProduct, useSaveProduct } from "@/features/product/hooks/use-products";
import {
  buildAttributeValues,
  buildCreateBody,
  buildProductSchema,
  buildUpdateBody,
  emptyProductInput,
  optionalNumber,
  productToInput,
  type ProductContext,
  type ProductInput,
} from "@/features/product/schemas/product-schema";
import type { ProductCategoryOption, ProductScope, ProductTemplate } from "@/features/product/types/product";
import { ProductAttributeFields } from "@/features/product/components/products/product-attribute-fields";
import { ProductNotice } from "@/features/product/components/products/product-notice";

const EMPTY_TEMPLATE: ProductTemplate = { fields: [], axes: [] };

/* Hai bộ thuộc tính giống nhau khi cùng id + giá trị — để chỉ PUT thuộc tính khi người dùng thật sự sửa. */
function attributeSignature(rows: { attributeId: string; attributeValueId?: string | null; value?: string | null; customValue?: string }[]) {
  return JSON.stringify(
    rows
      .map((r) => [r.attributeId, r.attributeValueId ?? r.customValue ?? r.value ?? ""])
      .sort((a, b) => a[0].localeCompare(b[0])),
  );
}

function ProductFormSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Skeleton className="h-96 w-full rounded-xl lg:col-span-2" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}

/*
 * Form thông tin sản phẩm (tạo mới hoặc sửa) DÙNG CHUNG hai cổng (`scope`).
 * Biến thể + ảnh quản lý ở tab riêng trong màn chi tiết vì đi endpoint riêng;
 * tạo xong chuyển sang chi tiết để thêm biến thể / ảnh rồi đăng bán.
 *
 * RẼ NHÁNH theo attributeMode của ngành đang chọn (PLAN-0016):
 * - legacy_fashion: giới tính / chất liệu / bảo quản như cũ;
 * - dynamic: thuộc tính cấp sản phẩm sinh từ MẪU của ngành (trục biến thể để ở
 *   tab Biến thể).
 * Chỉ ngành LÁ chọn được (backend từ chối ngành cha).
 *
 * Chờ danh sách ngành xong mới dựng form: kiểu thuộc tính của sản phẩm cũ phải
 * biết trước khi hiện đúng nhóm ô nhập, tránh nháy form thời trang rồi đổi.
 */
export function ProductForm({ scope, product }: { scope: ProductScope; product?: ProductAdminResponse }) {
  const categories = useProductCategories(scope);

  if (categories.error) return <ApiErrorState error={categories.error} fallback="Không tải được danh sách ngành hàng." />;
  if (categories.isPending || !categories.data) return <ProductFormSkeleton />;
  return <ProductFormBody key={product?.id ?? "new"} scope={scope} product={product} categories={categories.data} />;
}

function ProductFormBody({
  scope,
  product,
  categories,
}: {
  scope: ProductScope;
  product?: ProductAdminResponse;
  categories: ProductCategoryOption[];
}) {
  const router = useRouter();
  const { can, detailHref, isVendor } = useProductScope(scope);
  const create = useCreateProduct(scope);
  const save = useSaveProduct(scope, product?.id ?? "");
  const pending = create.isPending || save.isPending;
  const canEdit = product ? can.update : can.create;
  const [attrError, setAttrError] = useState<string | null>(null);

  /*
   * `categoryId` đồng thời nằm ở state này và trong RHF: ngành quyết định schema
   * (legacy cần giới tính/chất liệu/bảo quản, dynamic cần mẫu thuộc tính) nên phải
   * biết TRƯỚC khi dựng resolver — không đọc ngược từ form được.
   */
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const category = resolveProductCategory(categories, categoryId, product);
  const current = resolveProductCategory(categories, product?.categoryId ?? "", product);
  const { template, isPending: templatePending, error: templateError } = useCategoryTemplate(scope, category);

  const legacy = category?.attributeMode === "legacy_fashion";
  const dynamic = category?.attributeMode === "dynamic";
  const ctx = useMemo<ProductContext>(
    () => ({ legacy, platform: !isVendor, template: template ?? EMPTY_TEMPLATE }),
    [legacy, isVendor, template],
  );
  const schema = useMemo(() => buildProductSchema(ctx), [ctx]);

  const form = useForm<ProductInput>({
    resolver: zodResolver(schema),
    defaultValues: product ? productToInput(product) : emptyProductInput(),
  });
  const errors = form.formState.errors;

  /*
   * Đã có biến thể → khoá luôn ô chọn ngành: backend chỉ cho đổi sang ngành cùng kiểu
   * thuộc tính và cùng bộ trục biến thể, khác đi là 409 PRODUCT_CATEGORY_LOCKED (biến
   * thể + thuộc tính cũ sẽ mồ côi). Khoá hẳn dễ hiểu hơn mời chọn rồi báo lỗi. Ngành
   * của sản phẩm có thể đã bị tắt (không còn trong danh sách ngành lá) → thêm vào đầu
   * danh sách để ô chọn vẫn hiện đúng ngành hiện tại.
   */
  const hasVariants = (product?.variants.length ?? 0) > 0;
  const categoryOptions = useMemo(
    () => (current && !categories.some((c) => c.id === current.id) ? [current, ...categories] : categories),
    [categories, current],
  );

  const attributes = useWatch({ control: form.control, name: "attributes" });
  const isNew = useWatch({ control: form.control, name: "isNew" });
  const isFeatured = useWatch({ control: form.control, name: "isFeatured" });
  const attrErrors: Record<string, string | undefined> = {};
  for (const [id, err] of Object.entries(errors.attributes ?? {})) attrErrors[id] = (err as FieldError | undefined)?.message;

  const setAttribute = (attributeId: string, value: string) =>
    form.setValue(`attributes.${attributeId}`, value, { shouldDirty: true, shouldValidate: !!attrErrors[attributeId] });

  const onCategoryChange = (id: string) => {
    setCategoryId(id);
    form.setValue("categoryId", id, { shouldDirty: true, shouldValidate: true });
    setAttrError(null);
  };

  /* Lỗi nghiệp vụ nêu rõ ô gây lỗi → gắn đúng chỗ (toast của hook vẫn hiện). */
  const showFieldError = (e: unknown) => {
    const code = apiErrorCode(e);
    const message = apiMessage(e);
    if (!message) return;
    if (code === "PRODUCT_CATEGORY_LOCKED" || code === "PRODUCT_CATEGORY_INVALID") form.setError("categoryId", { message });
    else if (code === "PRODUCT_SLUG_EXISTS") form.setError("slug", { message });
    else if (code === "PRODUCT_ATTRIBUTE_INVALID" || code === "PRODUCT_ATTRIBUTE_REQUIRED") setAttrError(message);
  };

  const submit = (input: ProductInput) => {
    setAttrError(null);
    if (!product) {
      create.mutate(buildCreateBody(input, ctx), {
        onSuccess: (created) => router.push(detailHref(created.id)),
        onError: showFieldError,
      });
      return;
    }

    // Chỉ PUT thuộc tính khi ngành dynamic, mẫu đã tải xong và giá trị thật sự đổi.
    let attributeValues: AttributeValueInput[] | undefined;
    if (dynamic && template) {
      const next = buildAttributeValues(input.attributes, template);
      if (attributeSignature(next) !== attributeSignature(product.attributeValues ?? [])) attributeValues = next;
    }
    save.mutate(
      { patch: buildUpdateBody(input, ctx), attributeValues },
      {
        onSuccess: (updated) => {
          form.reset(productToInput(updated));
          setCategoryId(updated.categoryId);
        },
        onError: showFieldError,
      },
    );
  };

  const blocked = dynamic && (templatePending || !!templateError);

  return (
    <form noValidate onSubmit={form.handleSubmit(submit)} className="grid gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông tin cơ bản</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldSet disabled={!canEdit} className="min-w-0 border-0 p-0">
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="p-name">Tên sản phẩm</FieldLabel>
                  <Input id="p-name" maxLength={200} aria-invalid={!!errors.name} {...form.register("name")} />
                  <FormMessage message={errors.name?.message} />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="p-cat">Ngành hàng (cấp cuối)</FieldLabel>
                    <NativeSelect
                      id="p-cat"
                      aria-invalid={!!errors.categoryId}
                      value={categoryId}
                      disabled={hasVariants}
                      onChange={(e) => onCategoryChange(e.target.value)}
                    >
                      <option value="">— Chọn ngành hàng —</option>
                      {categoryOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.path}
                        </option>
                      ))}
                    </NativeSelect>
                    <FormMessage message={errors.categoryId?.message} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="p-slug">Slug (trống = tự sinh)</FieldLabel>
                    <Input id="p-slug" aria-invalid={!!errors.slug} {...form.register("slug")} />
                    <FormMessage message={errors.slug?.message} />
                  </Field>
                </div>

                {hasVariants ? (
                  <ProductNotice tone="warning">
                    Sản phẩm đã có biến thể nên không đổi được ngành hàng — biến thể và thuộc tính cũ sẽ không còn khớp. Muốn chuyển sang
                    ngành khác, hãy tạo sản phẩm mới ở ngành đó.
                  </ProductNotice>
                ) : null}
                {category ? (
                  <ProductNotice tone="info">
                    {legacy
                      ? "Ngành thời trang: nhập giới tính, chất liệu, bảo quản; biến thể là màu × size."
                      : templatePending
                        ? "Đang tải mẫu thuộc tính của ngành…"
                        : template && template.axes.length > 0
                          ? `Biến thể theo ${template.axes.map((a) => a.name).join(" × ")} — chọn giá trị ở tab Biến thể sau khi lưu.`
                          : "Ngành này không có trục biến thể — sản phẩm chỉ có đúng một biến thể mặc định."}
                  </ProductNotice>
                ) : (
                  <ProductNotice tone="info">Chọn ngành hàng cấp cuối để nhập đúng thuộc tính của ngành đó.</ProductNotice>
                )}

                <Field>
                  <FieldLabel htmlFor="p-short">Mô tả ngắn</FieldLabel>
                  <Textarea id="p-short" rows={2} maxLength={500} {...form.register("shortDescription")} />
                  <FormMessage message={errors.shortDescription?.message} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="p-desc">Mô tả chi tiết</FieldLabel>
                  <Textarea id="p-desc" rows={8} {...form.register("description")} />
                  <FormMessage message={errors.description?.message} />
                </Field>

                {legacy ? (
                  <>
                    <Field>
                      <FieldLabel htmlFor="p-gender">Giới tính</FieldLabel>
                      <NativeSelect id="p-gender" aria-invalid={!!errors.gender} className="sm:max-w-48" {...form.register("gender")}>
                        <option value="">— Chọn —</option>
                        {Object.entries(GENDER_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </NativeSelect>
                      <FormMessage message={errors.gender?.message} />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="p-material">Chất liệu</FieldLabel>
                        <Input id="p-material" placeholder="Cotton 100%" aria-invalid={!!errors.material} {...form.register("material")} />
                        <FormMessage message={errors.material?.message} />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="p-care">Hướng dẫn bảo quản (mỗi dòng một mục)</FieldLabel>
                        <Textarea
                          id="p-care"
                          rows={3}
                          placeholder={"Giặt máy nước lạnh\nKhông tẩy"}
                          aria-invalid={!!errors.care}
                          {...form.register("care")}
                        />
                        <FormMessage message={errors.care?.message} />
                      </Field>
                    </div>
                  </>
                ) : null}
              </FieldGroup>
            </FieldSet>
          </CardContent>
        </Card>

        {dynamic ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thuộc tính sản phẩm</CardTitle>
              <CardDescription>Theo mẫu của ngành {category?.name}. Trục biến thể chọn ở tab Biến thể.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {attrError ? <ProductNotice tone="danger">{attrError}</ProductNotice> : null}
              {templateError ? (
                <ApiErrorState error={templateError} fallback="Không tải được mẫu thuộc tính của ngành." compact />
              ) : templatePending || !template ? (
                <Skeleton className="h-24 w-full rounded-lg" />
              ) : (
                <FieldSet disabled={!canEdit} className="min-w-0 border-0 p-0">
                  <ProductAttributeFields
                    template={template}
                    values={attributes}
                    errors={attrErrors}
                    saved={product?.attributeValues}
                    onChange={setAttribute}
                  />
                </FieldSet>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isVendor ? "Giá" : "Giá & nhãn"}</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldSet disabled={!canEdit} className="min-w-0 border-0 p-0">
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="p-price">Giá bán (VND)</FieldLabel>
                  <Input
                    id="p-price"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1000}
                    placeholder="VD: 250000"
                    aria-invalid={!!errors.basePrice}
                    {...form.register("basePrice", { valueAsNumber: true })}
                  />
                  <FormMessage message={errors.basePrice?.message} />
                  <p className="text-xs text-muted-foreground">Biến thể có thể đặt giá riêng ở tab Biến thể.</p>
                </Field>
                <Field>
                  <FieldLabel htmlFor="p-list">Giá gốc gạch (VND, trống = không giảm)</FieldLabel>
                  <Input
                    id="p-list"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1000}
                    aria-invalid={!!errors.listPrice}
                    {...form.register("listPrice", { setValueAs: optionalNumber })}
                  />
                  <FormMessage message={errors.listPrice?.message} />
                </Field>
                {!isVendor ? (
                  <>
                    <Field>
                      <FieldLabel htmlFor="p-tags">Tag (phẩy)</FieldLabel>
                      <Input id="p-tags" placeholder="new, basic, summer" aria-invalid={!!errors.tags} {...form.register("tags")} />
                      <FormMessage message={errors.tags?.message} />
                    </Field>
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={isNew}
                        onCheckedChange={(v) => form.setValue("isNew", v, { shouldDirty: true })}
                        disabled={!canEdit}
                      />
                      Gắn nhãn &quot;Mới&quot;
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={isFeatured}
                        onCheckedChange={(v) => form.setValue("isFeatured", v, { shouldDirty: true })}
                        disabled={!canEdit}
                      />
                      Sản phẩm nổi bật (trang chủ)
                    </label>
                  </>
                ) : null}
              </FieldGroup>
            </FieldSet>
          </CardContent>
        </Card>

        {canEdit ? (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Hủy
            </Button>
            <Button type="submit" disabled={pending || blocked || (!!product && !form.formState.isDirty)}>
              {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {product ? "Lưu thay đổi" : "Tạo sản phẩm"}
            </Button>
          </div>
        ) : null}
      </div>
    </form>
  );
}
