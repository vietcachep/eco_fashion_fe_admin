"use client";

import { Loader2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { FilePicker } from "@/components/shared/file-picker";
import type { MediaItemInput } from "@/lib/api/generated/model";
import { useUploadReturnEvidence } from "@/features/order/hooks/use-return-evidence";
import { RETURN_EVIDENCE_MAX } from "@/features/order/schemas/return-schema";

/*
 * Chọn ảnh minh chứng của shop (từ chối / xác nhận nhận hàng). Mỗi ảnh tải lên NGAY khi chọn (backend chỉ nhận URL do kho upload
 * trả về) rồi hiện thành ô xem trước có nút gỡ. Dùng lại `FilePicker` làm nút chọn + kiểm cỡ ≤ 5MB; ô xem trước của nó bị ẩn
 * vì ảnh đã chọn hiện ở lưới bên dưới. Danh sách do dialog giữ (state) — component này chỉ trình bày + tải.
 */
export function ReturnEvidencePicker({ value, onChange }: { value: MediaItemInput[]; onChange: (next: MediaItemInput[]) => void }) {
  const upload = useUploadReturnEvidence();
  const full = value.length >= RETURN_EVIDENCE_MAX;

  return (
    <div className="flex flex-col gap-2">
      {value.length ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((m, i) => (
            <li key={`${m.url}-${i}`} className="relative size-16 overflow-hidden rounded-md border bg-muted/40">
              {/* eslint-disable-next-line @next/next/no-img-element -- ảnh động (Cloudinary) */}
              <img src={m.url} alt={m.name} className="size-full object-cover" />
              <button
                type="button"
                aria-label={`Gỡ ảnh ${m.name}`}
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="absolute top-0.5 right-0.5 flex size-5 items-center justify-center rounded-full bg-background/90 text-foreground shadow ring-1 ring-border hover:bg-background"
              >
                <XIcon className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {upload.isPending ? (
        // Tải từng ảnh một: callback onSuccess của mutate chỉ chạy cho lần gọi mới nhất, nên không cho chọn thêm khi đang tải.
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Đang tải ảnh lên…
        </p>
      ) : full ? (
        <p className="text-xs text-muted-foreground">Đã đủ {RETURN_EVIDENCE_MAX} ảnh.</p>
      ) : (
        <FilePicker
          file={null}
          onChange={(file) => {
            if (!file) return;
            upload.mutate(file, { onSuccess: (item) => onChange([...value, item]) });
          }}
          onError={(message) => toast.error(message)}
          label={value.length ? "Thêm ảnh" : "Chọn ảnh"}
          previewClassName="hidden"
        />
      )}
    </div>
  );
}
