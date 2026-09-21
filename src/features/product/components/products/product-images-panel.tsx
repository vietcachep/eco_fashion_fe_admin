"use client";

import { useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, Loader2Icon, StarIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { NativeSelect } from "@/components/shared/native-select";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PERMISSIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { usePermission } from "@/hooks/use-permission";
import {
  useRemoveProductImage,
  useReorderProductImages,
  useUpdateProductImage,
  useUploadProductImage,
} from "@/features/product/hooks/use-products";
import type { ProductAdminResponse } from "@/lib/api/generated/model";

/*
 * Ảnh sản phẩm: lưới ảnh theo thứ tự, gắn ảnh cho màu (ảnh chung = null),
 * đặt ảnh chính, đổi thứ tự bằng nút trái/phải, xoá. Upload nhiều file một
 * lượt (mỗi file một request — backend nhận từng ảnh).
 */
export function ProductImagesPanel({ product }: { product: ProductAdminResponse }) {
  const upload = useUploadProductImage(product.id);
  const update = useUpdateProductImage(product.id);
  const remove = useRemoveProductImage(product.id);
  const reorder = useReorderProductImages(product.id);
  const canEdit = usePermission(PERMISSIONS.productUpdate);
  const [uploadColor, setUploadColor] = useState("");
  const [toDelete, setToDelete] = useState<string | null>(null);

  const colors = Array.from(new Map(product.variants.map((v) => [v.colorCode, v.color])).entries());
  const images = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);

  const pickFiles = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      for (const f of files) {
        if (f.size > 5 * 1024 * 1024) {
          toast.error(`${f.name}: ảnh tối đa 5MB.`);
          continue;
        }
        await upload.mutateAsync({ file: f, colorCode: uploadColor || undefined, isPrimary: images.length === 0 });
      }
    };
    input.click();
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
        <CardTitle className="text-base">{images.length} ảnh</CardTitle>
        <PermissionGate permission={PERMISSIONS.productUpdate}>
          <div className="flex items-center gap-2">
            <NativeSelect aria-label="Ảnh thuộc màu" className="w-40" value={uploadColor} onChange={(e) => setUploadColor(e.target.value)}>
              <option value="">Ảnh chung</option>
              {colors.map(([code, name]) => (
                <option key={code} value={code}>
                  Màu {name}
                </option>
              ))}
            </NativeSelect>
            <Button size="sm" onClick={pickFiles} disabled={upload.isPending}>
              {upload.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
              Tải ảnh lên
            </Button>
          </div>
        </PermissionGate>
      </CardHeader>
      <CardContent>
        {images.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có ảnh — sản phẩm cần ít nhất một ảnh để đăng bán.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {images.map((img, i) => (
              <div key={img.id} className={cn("group relative overflow-hidden rounded-lg border", img.isPrimary && "ring-2 ring-primary")}>
                {/* eslint-disable-next-line @next/next/no-img-element -- ảnh Cloudinary động */}
                <img src={img.url} alt="" className="aspect-[3/4] w-full object-cover" />
                {img.isPrimary ? (
                  <span className="absolute top-1.5 left-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">Ảnh chính</span>
                ) : null}
                <div className="flex items-center gap-1 border-t bg-card p-1.5">
                  <NativeSelect
                    aria-label="Màu của ảnh"
                    className="h-7 flex-1 text-xs"
                    disabled={!canEdit}
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
                {canEdit ? (
                  <div className="flex items-center justify-between border-t bg-card px-1 py-0.5">
                    <Button variant="ghost" size="icon" className="size-7" title="Sang trái" disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowLeftIcon className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7" title="Đặt làm ảnh chính" disabled={img.isPrimary} onClick={() => update.mutate({ imageId: img.id, body: { isPrimary: true } })}>
                      <StarIcon className={cn("size-3.5", img.isPrimary && "fill-primary text-primary")} />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7 text-destructive" title="Xoá" onClick={() => setToDelete(img.id)}>
                      <Trash2Icon className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7" title="Sang phải" disabled={i === images.length - 1} onClick={() => move(i, 1)}>
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
        confirmLabel="Xoá"
        destructive
        onConfirm={() => toDelete && remove.mutate(toDelete)}
      />
    </Card>
  );
}
