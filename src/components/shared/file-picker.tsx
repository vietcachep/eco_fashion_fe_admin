"use client";

import { useRef } from "react";
import { ImageIcon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/*
 * Ô chọn ảnh dùng chung (banner, ngành hàng, bộ sưu tập, ảnh sản phẩm, avatar):
 * nút chọn + xem trước. Chỉ trình bày — nơi gọi giữ File và gọi API upload.
 * Chấp nhận JPG/PNG/WEBP ≤ 5MB đúng giới hạn backend; kiểm ở đây để khỏi tốn
 * một lượt gọi chắc chắn thất bại.
 */
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

export function FilePicker({
  file,
  previewUrl,
  onChange,
  onError,
  label = "Chọn ảnh",
  className,
  previewClassName,
}: {
  file: File | null;
  /** Ảnh hiện tại từ server (khi sửa) — hiện nếu chưa chọn file mới. */
  previewUrl?: string | null;
  onChange: (file: File | null) => void;
  onError?: (message: string) => void;
  label?: string;
  className?: string;
  previewClassName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const src = file ? URL.createObjectURL(file) : previewUrl || null;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40",
          previewClassName,
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL blob/Cloudinary động, không qua next/image
          <img src={src} alt="" className="size-full object-cover" />
        ) : (
          <ImageIcon className="size-6 text-muted-foreground/60" />
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            e.target.value = "";
            if (!f) return;
            if (f.size > MAX_BYTES) {
              onError?.("Ảnh tối đa 5MB.");
              return;
            }
            onChange(f);
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <UploadIcon className="size-3.5" />
          {label}
        </Button>
        <p className="text-xs text-muted-foreground">
          {file ? file.name : "JPG / PNG / WEBP, tối đa 5MB"}
        </p>
      </div>
    </div>
  );
}
