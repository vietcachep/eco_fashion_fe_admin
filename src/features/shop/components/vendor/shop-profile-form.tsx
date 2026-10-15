"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { DetailList } from "@/components/shared/detail-list";
import { FilePicker } from "@/components/shared/file-picker";
import { FormMessage } from "@/components/shared/form-message";
import { StatusBadge } from "@/components/shared/status-badge";
import { usePermission } from "@/hooks/use-permission";
import { PERMISSIONS } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/format";
import { SHOP_STATUS, statusMeta } from "@/lib/labels";
import type { ShopResponse, UpdateShopProfileRequest } from "@/lib/api/generated/model";
import { useUploadMedia } from "@/features/shop/hooks/use-media-upload";
import { useMyShop, useUpdateMyShop } from "@/features/shop/hooks/use-shop-profile";
import { shopProfileSchema, type ShopProfileInput } from "@/features/shop/schemas/shop-profile-schema";
import { ShopBankAccountCard } from "@/features/shop/components/vendor/shop-bank-account-card";

const LOAD_ERROR = "Không tải được hồ sơ gian hàng.";

/*
 * Hồ sơ gian hàng của CHÍNH vendor (GET/PATCH /shop/me): tên/mô tả/logo/banner + tài khoản ngân hàng nhận đối soát vendor
 * tự sửa (quyền shop.profile.update — chỉ chủ shop); mã/slug/trạng thái/hoa hồng do sàn quản nên chỉ đọc.
 */
export function ShopProfileForm() {
  const { data: shop, isPending, error } = useMyShop();

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;
  if (isPending || !shop) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  /*
   * `key` theo updatedAt: sau mỗi lần lưu thành công backend đổi updatedAt → các form con dựng lại từ dữ liệu mới
   * (xoá file đã chọn, đóng form ngân hàng) mà không cần setState trong effect.
   */
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <ShopIdentityCard key={`identity-${shop.updatedAt}`} shop={shop} />
        <ShopBankAccountCard key={`bank-${shop.updatedAt}`} shop={shop} />
      </div>
      <ShopPlatformInfoCard shop={shop} />
    </div>
  );
}

function ShopIdentityCard({ shop }: { shop: ShopResponse }) {
  const canEdit = usePermission(PERMISSIONS.shopProfileUpdate);
  const update = useUpdateMyShop();
  const upload = useUploadMedia();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [bannerRemoved, setBannerRemoved] = useState(false);

  const form = useForm<ShopProfileInput>({
    resolver: zodResolver(shopProfileSchema),
    defaultValues: { name: shop.name, description: shop.description ?? "" },
  });
  const errors = form.formState.errors;
  const pending = upload.isPending || update.isPending;

  /*
   * Ảnh mới phải lên Cloudinary TRƯỚC (cần URL) rồi mới PATCH hồ sơ. Bước tải ảnh lỗi → dừng, toast do hook upload lo;
   * không gửi PATCH dở dang. `null` = xoá ảnh, `undefined` (bỏ khoá) = giữ nguyên.
   */
  const submit = form.handleSubmit(async (input) => {
    const body: UpdateShopProfileRequest = { name: input.name, description: input.description || null };
    try {
      if (logoFile) body.logoUrl = (await upload.mutateAsync(logoFile)).url;
      else if (logoRemoved) body.logoUrl = null;
      if (bannerFile) body.bannerUrl = (await upload.mutateAsync(bannerFile)).url;
      else if (bannerRemoved) body.bannerUrl = null;
    } catch {
      return;
    }
    update.mutate(body);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Hồ sơ gian hàng</CardTitle>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          {/* fieldset disabled: nhân viên (không có shop.profile.update) xem được nhưng mọi ô/nút đều khoá. */}
          <fieldset disabled={!canEdit || pending} className="contents">
            <FieldGroup className="gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <ImageField
                  label="Logo"
                  hint="Ảnh vuông, hiện cạnh tên shop."
                  file={logoFile}
                  currentUrl={logoRemoved ? null : shop.logoUrl}
                  removed={logoRemoved}
                  canEdit={canEdit}
                  onFile={(f) => {
                    setLogoFile(f);
                    setLogoRemoved(false);
                  }}
                  onToggleRemove={() => setLogoRemoved((v) => !v)}
                  hasOriginal={!!shop.logoUrl}
                  previewClassName="size-20"
                />
                <ImageField
                  label="Banner"
                  hint="Ảnh ngang, đầu trang gian hàng."
                  file={bannerFile}
                  currentUrl={bannerRemoved ? null : shop.bannerUrl}
                  removed={bannerRemoved}
                  canEdit={canEdit}
                  onFile={(f) => {
                    setBannerFile(f);
                    setBannerRemoved(false);
                  }}
                  onToggleRemove={() => setBannerRemoved((v) => !v)}
                  hasOriginal={!!shop.bannerUrl}
                  previewClassName="h-20 w-36"
                />
              </div>
              <Field>
                <FieldLabel htmlFor="shop-name">Tên gian hàng</FieldLabel>
                <Input id="shop-name" aria-invalid={!!errors.name} {...form.register("name")} />
                <FormMessage message={errors.name?.message} />
              </Field>
              <Field>
                <FieldLabel htmlFor="shop-desc">Mô tả</FieldLabel>
                <Textarea id="shop-desc" rows={4} placeholder="Giới thiệu ngắn về gian hàng, ngành hàng chính, chính sách bảo hành…" aria-invalid={!!errors.description} {...form.register("description")} />
                <FormMessage message={errors.description?.message} />
              </Field>
            </FieldGroup>
          </fieldset>
          {canEdit ? (
            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
                Lưu hồ sơ
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Chỉ chủ gian hàng được sửa hồ sơ — bạn đang xem ở chế độ chỉ đọc.</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

/* Logo/banner: chọn file mới (xem trước tại chỗ, chỉ tải lên khi bấm Lưu) hoặc gỡ ảnh hiện tại. */
function ImageField({
  label,
  hint,
  file,
  currentUrl,
  removed,
  hasOriginal,
  canEdit,
  onFile,
  onToggleRemove,
  previewClassName,
}: {
  label: string;
  hint: string;
  file: File | null;
  currentUrl?: string | null;
  removed: boolean;
  /** Shop đang có ảnh trên server (để biết có gì mà gỡ). */
  hasOriginal: boolean;
  canEdit: boolean;
  onFile: (file: File | null) => void;
  onToggleRemove: () => void;
  previewClassName: string;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <FilePicker
        file={file}
        previewUrl={currentUrl}
        onChange={onFile}
        onError={(m) => toast.error(m)}
        label={hasOriginal || file ? "Đổi ảnh" : "Chọn ảnh"}
        previewClassName={previewClassName}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
      {canEdit && hasOriginal && !file ? (
        <Button type="button" variant="ghost" size="sm" className="w-fit px-2 text-muted-foreground" onClick={onToggleRemove}>
          {removed ? "Hoàn tác — giữ ảnh hiện tại" : "Gỡ ảnh này"}
        </Button>
      ) : null}
    </Field>
  );
}

function ShopPlatformInfoCard({ shop }: { shop: ShopResponse }) {
  const meta = statusMeta(SHOP_STATUS, shop.status);
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-base">Thông tin do sàn quản lý</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <DetailList
          rows={[
            { label: "Mã shop", value: <span className="font-mono">{shop.code}</span> },
            { label: "Slug", value: shop.slug },
            { label: "Trạng thái", value: <StatusBadge tone={meta.tone}>{shop.statusLabel || meta.label}</StatusBadge> },
            { label: "Hoa hồng sàn", value: `${Number(shop.commissionRate)}%` },
            { label: "Sản phẩm", value: formatNumber(shop.totalProducts) },
            { label: "Tạo lúc", value: formatDate(shop.createdAt) },
          ]}
        />
        <p className="text-xs text-muted-foreground">
          Mã, slug, trạng thái và hoa hồng do sàn quản lý — cần đổi hãy liên hệ bộ phận hỗ trợ nhà cung cấp.
        </p>
      </CardContent>
    </Card>
  );
}
