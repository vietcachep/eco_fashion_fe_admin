"use client";

import { useState } from "react";
import { ExternalLinkIcon, ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/*
 * Ảnh chứng từ chuyển khoản của yêu cầu nộp quỹ: thumbnail trong bảng, bấm để xem phóng to ngay
 * trong màn (không mở tab mới) — kế toán cần đọc rõ số tiền / nội dung chuyển khoản trước khi duyệt.
 */
export function DepositProofPreview({ url, shopName }: { url: string | null; shopName: string | null }) {
  const [open, setOpen] = useState(false);
  if (!url) return <span className="text-muted-foreground">—</span>;

  return (
    <>
      <button
        type="button"
        aria-label="Xem chứng từ"
        onClick={() => setOpen(true)}
        className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40 transition-opacity hover:opacity-80"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh chứng từ động Cloudinary */}
        <img src={url} alt="Chứng từ nộp quỹ" className="size-full object-cover" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="size-4" />
              Chứng từ nộp quỹ{shopName ? ` — ${shopName}` : ""}
            </DialogTitle>
            <DialogDescription>
              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                Mở ảnh gốc
                <ExternalLinkIcon className="size-3.5" />
              </a>
            </DialogDescription>
          </DialogHeader>
          {/* eslint-disable-next-line @next/next/no-img-element -- ảnh chứng từ động Cloudinary */}
          <img src={url} alt="Chứng từ nộp quỹ" className="max-h-[70vh] w-full rounded-lg border object-contain" />
        </DialogContent>
      </Dialog>
    </>
  );
}
