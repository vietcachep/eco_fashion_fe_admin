"use client";

import { useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, Loader2Icon, StarIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { NativeSelect } from "@/components/shared/native-select";
import { cn } from "@/lib/utils";
import type { ProductAdminResponse } from "@/lib/api/generated/model";
import { useProductScope } from "@/features/product/hooks/use-product-scope";
import {
  useRemoveProductImage,
  useReorderProductImages,
  useUpdateProductImage,
  useUploadProductImage,
} from "@/features/product/hooks/use-products";
import type { ProductScope } from "@/features/product/types/product";

/* Giới hạn của backend: ≤ 12 ảnh/sản phẩm, mỗi ảnh ≤ 5MB (JPG/PNG/WEBP/GIF, kiểm nội dung thật của file). */
const MAX_IMAGES = 12;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

/*
 * Ảnh sản phẩm: lưới ảnh theo thứ tự, đặt ảnh chính, đổi thứ tự bằng nút
 * trái/phải, xoá. Upload nhiều file một lượt (mỗi file một request — backend nhận
 * từng ảnh, có giới hạn tần suất nên dừng ở lỗi đầu tiên).
 *
 * - Đổi thứ tự gửi thứ tự MỚI của mọi ảnh và ảnh đầu tiên TỰ thành ảnh chính.
 * - Gắn ảnh theo MÀU chỉ có ở ngành thời trang (biến thể có colorCode); ngành
 *   dynamic dùng ảnh chung.
 * - Không xoá được ảnh cuối của sản phẩm đang bán (409 PRODUCT_IMAGE_REQUIRED) —
 *   backend báo, toast hiện nguyên văn.
 */
export function ProductImagesPanel({ scope, product }: { scope: ProductScope; product: ProductAdminResponse }) {
  const { can } = useProductScope(scope);
  const upload = useUploadProductImage(scope, product.id);
  const update = useUpdateProductImage(scope, product.id);
  const remove = useRemoveProductImage(scope, product.id);
  const reorder = useReorderProductImages(scope, product.id);
  const canEdit = can.update;
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadColor, setUploadColor] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const colors = Array.from(
    new Map(
      product.variants.flatMap((v) => (v.colorCode ? [[v.colorCode, v.color ?? v.colorCode] as const] : [])),
    ).entries(),
  );
  const byColor = colors.length > 0;
  const images = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);
  const busy = upload.isPending || update.isPending || remove.isPending || reorder.isPending;
  const full = images.length >= MAX_IMAGES;
  // Khoá sẵn nút xoá ảnh cuối của sản phẩm đang bán (backend sẽ 409 PRODUCT_IMAGE_REQUIRED) — hiểu ngay lý do thay vì chờ lỗi.
  const lastOfActive = product.status === "active" && images.length <= 1;

  const uploadFiles = async (files: File[]) => {
    const room = MAX_IMAGES - images.length;
    const queue = files.slice(0, Math.max(0, room));
    if (files.length > queue.length) toast.error(`Chỉ còn chỗ cho ${room} ảnh nữa (tối đa ${MAX_IMAGES} ảnh).`);

    let hasPrimary = images.length > 0;
    for (const [i, file] of queue.entries()) {
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name}: ảnh tối đa 5MB.`);
        continue;
      }
      setProgress({ done: i, total: queue.length });
      try {
        await upload.mutateAsync({ file, colorCode: uploadColor || undefined, isPrimary: !hasPrimary });
        hasPrimary = true;
      } catch {
        break; // toast lỗi đã hiện ở hook; dừng để khỏi dội thêm request bị từ chối / giới hạn tần suất
      }
    }
    setProgress(null);
  };

  const move = (index: number, dir: -1 | 1) => {
    const ids = images.map((i) => i.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    reorder.mutate(ids);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">
          {images.length}/{MAX_IMAGES} ảnh
          <span className="ml-2 text-xs font-normal text-muted-foreground">Ảnh đầu tiên là ảnh chính</span>
        </CardTitle>
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            {byColor ? (
              <NativeSelect aria-label="Ảnh thuộc màu" className="w-40" value={uploadColor} onChange={(e) => setUploadColor(e.target.value)}>
                <option value="">Ảnh chung</option>
                {colors.map(([code, name]) => (
                  <option key={code} value={code}>
                    Màu {name}
                  </option>
                ))}
              </NativeSelect>
            ) : null}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                void uploadFiles(files);
              }}
            />
            <Button size="sm" onClick={() => inputRef.current?.click()} disabled={busy || full}>
              {upload.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
              {progress ? `Đang tải ${progress.done + 1}/${progress.total}…` : "Tải ảnh lên"}
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        {images.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có ảnh — sản phẩm cần ít nhất một ảnh để đăng bán. JPG / PNG / WEBP / GIF, tối đa 5MB mỗi ảnh.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {images.map((img, i) => (
              <div key={img.id} className={cn("relative overflow-hidden rounded-lg border", img.isPrimary && "ring-2 ring-primary")}>
                {/* eslint-disable-next-line @next/next/no-img-element -- ảnh Cloudinary động */}
                <img src={img.url} alt="" className="aspect-[3/4] w-full object-cover" />
                {img.isPrimary ? (
                  <span className="absolute top-1.5 left-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">Ảnh chính</span>
                ) : null}
                {byColor ? (
                  <div className="flex items-center gap-1 border-t bg-card p-1.5">
                    <NativeSelect
                      aria-label="Màu của ảnh"
                      className="h-7 flex-1 text-xs"
                      disabled={!canEdit || busy}
                      value={img.colorCode ?? ""}
                      onChange={(e) => update.mutate({ imageId: img.id, body: { colorCode: e.target.value || null } })}
                    >
                      <option value="">Chung</option>
                      {colors.map(([code, name]) => (
                        <option key={code} value={code}>
                          {name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                ) : null}
                {canEdit ? (
                  <div className="flex items-center justify-between border-t bg-card px-1 py-0.5">
                    <Button variant="ghost" size="icon" className="size-7" title="Sang trái" aria-label="Sang trái" disabled={busy || i === 0} onClick={() => move(i, -1)}>
                      <ArrowLeftIcon className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Đặt làm ảnh chính"
                      aria-label="Đặt làm ảnh chính"
                      disabled={busy || img.isPrimary}
                      onClick={() => update.mutate({ imageId: img.id, body: { isPrimary: true } })}
                    >
                      <StarIcon className={cn("size-3.5", img.isPrimary && "fill-primary text-primary")} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      title={lastOfActive ? "Sản phẩm đang bán phải còn ít nhất một ảnh" : "Xoá"}
                      aria-label="Xoá ảnh"
                      disabled={busy || lastOfActive}
                      onClick={() => setToDelete(img.id)}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Sang phải"
                      aria-label="Sang phải"
                      disabled={busy || i === images.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowRightIcon className="size-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Xoá ảnh này?"
        description={product.status === "active" ? "Sản phẩm đang bán phải còn ít nhất một ảnh." : undefined}
        confirmLabel="Xoá"
        destructive
        onConfirm={() => toDelete && remove.mutate(toDelete)}
      />
    </Card>
  );
}
