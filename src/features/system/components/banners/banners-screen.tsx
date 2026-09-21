"use client";

import { useState } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { PERMISSIONS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useBanners, useDeleteBanner } from "@/features/system/hooks/use-system";
import { BannerFormDialog } from "@/features/system/components/banners/banner-form-dialog";
import type { BannerResponse } from "@/features/system/types/system";

const LOAD_ERROR = "Không tải được banner.";
const POSITION_LABEL: Record<string, string> = { hero: "Hero (đầu trang)", promo: "Khối khuyến mãi" };

/* Banner trang chủ: lưới thẻ có ảnh, vị trí, lịch hiệu lực; thêm / sửa / xoá. */
export function BannersScreen() {
  const { data, isPending, error } = useBanners();
  const remove = useDeleteBanner();
  const [form, setForm] = useState<{ open: boolean; edit?: BannerResponse }>({ open: false });
  const [toDelete, setToDelete] = useState<BannerResponse | null>(null);

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <PermissionGate permission={PERMISSIONS.bannerManage}>
          <Button onClick={() => setForm({ open: true })}>
            <PlusIcon className="size-4" />
            Thêm banner
          </Button>
        </PermissionGate>
      </div>
      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Chưa có banner.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(data ?? []).map((b) => (
            <Card key={b.id} className={cn("overflow-hidden py-0", !b.isActive && "opacity-70")}>
              {/* eslint-disable-next-line @next/next/no-img-element -- ảnh động */}
              <img src={b.imageUrl} alt={b.title} className="aspect-[16/7] w-full object-cover" />
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{b.title}</p>
                    {b.subtitle ? <p className="truncate text-xs text-muted-foreground">{b.subtitle}</p> : null}
                  </div>
                  <StatusBadge tone={b.isActive ? "success" : "neutral"}>{b.isActive ? "Hiện" : "Ẩn"}</StatusBadge>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="font-normal">
                    {POSITION_LABEL[b.position] ?? b.position}
                  </Badge>
                  <span>#{b.sortOrder}</span>
                  {b.startsAt || b.endsAt ? (
                    <span>
                      {formatDate(b.startsAt)} → {formatDate(b.endsAt)}
                    </span>
                  ) : null}
                </div>
                {b.linkUrl ? <p className="truncate text-xs text-primary">{b.linkUrl}</p> : null}
                <PermissionGate permission={PERMISSIONS.bannerManage}>
                  <div className="flex justify-end gap-1 pt-1">
                    <Button variant="outline" size="sm" className="h-8" onClick={() => setForm({ open: true, edit: b })}>
                      <PencilIcon className="size-3.5" />
                      Sửa
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-destructive" onClick={() => setToDelete(b)}>
                      <Trash2Icon className="size-3.5" />
                      Xoá
                    </Button>
                  </div>
                </PermissionGate>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BannerFormDialog open={form.open} onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))} banner={form.edit} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Xoá banner "${toDelete?.title}"?`}
        confirmLabel="Xoá"
        destructive
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </div>
  );
}
