"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ImageIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { PERMISSIONS } from "@/lib/constants";
import { GENDER_LABEL } from "@/lib/labels";
import { usePermission } from "@/hooks/use-permission";
import {
  useAdminCollections,
  useRemoveCollection,
  useUploadCollectionImage,
} from "@/features/catalog/hooks/use-collections";
import { CollectionFormDialog } from "@/features/catalog/components/collections/collection-form-dialog";
import type { CollectionAdminResponse } from "@/lib/api/generated/model";

const LOAD_ERROR = "Không tải được bộ sưu tập.";

/* Bộ sưu tập trang chủ: bảng + form; ảnh đổi ngay khi chọn file. */
export function CollectionsScreen() {
  const { data, isPending, error } = useAdminCollections();
  const canManage = usePermission(PERMISSIONS.collectionManage);
  const remove = useRemoveCollection();
  const upload = useUploadCollectionImage();
  const [form, setForm] = useState<{ open: boolean; edit?: CollectionAdminResponse }>({ open: false });
  const [toDelete, setToDelete] = useState<CollectionAdminResponse | null>(null);

  const pickImage = (c: CollectionAdminResponse) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) return toast.error("Ảnh tối đa 5MB.");
      upload.mutate({ id: c.id, file: f });
    };
    input.click();
  };

  const columns: ColumnDef<CollectionAdminResponse>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Bộ sưu tập",
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={!canManage}
                onClick={() => pickImage(c)}
                title="Đổi ảnh"
                className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40"
              >
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- ảnh động
                  <img src={c.imageUrl} alt="" className="size-full object-cover" />
                ) : (
                  <ImageIcon className="size-4 text-muted-foreground/60" />
                )}
              </button>
              <div className="min-w-0">
                <p className="truncate font-medium">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  /{c.slug}
                  {c.tagline ? ` · ${c.tagline}` : ""}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: "query",
        header: "Bộ lọc",
        cell: ({ row }) => {
          const q = row.original.query;
          const chips = [
            q.category ? `Ngành: ${q.category}` : null,
            q.gender ? `Giới: ${GENDER_LABEL[q.gender] ?? q.gender}` : null,
            q.tag ? `Tag: ${q.tag}` : null,
          ].filter(Boolean) as string[];
          return chips.length ? (
            <div className="flex flex-wrap gap-1">
              {chips.map((c) => (
                <Badge key={c} variant="secondary" className="font-normal">
                  {c}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Tất cả sản phẩm</span>
          );
        },
      },
      { accessorKey: "sortOrder", header: "Thứ tự" },
      {
        accessorKey: "isActive",
        header: "Trạng thái",
        cell: ({ row }) => (
          <StatusBadge tone={row.original.isActive ? "success" : "neutral"}>
            {row.original.isActive ? "Hiện" : "Ẩn"}
          </StatusBadge>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Thao tác</span>,
        cell: ({ row }) => (
          <PermissionGate permission={PERMISSIONS.collectionManage}>
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon" className="size-8" title="Sửa" onClick={() => setForm({ open: true, edit: row.original })}>
                <PencilIcon className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8 text-destructive" title="Xoá" onClick={() => setToDelete(row.original)}>
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          </PermissionGate>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pickImage ổn định theo canManage
    [canManage],
  );

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-3">
      <DataTable
        columns={columns}
        data={data ?? []}
        loading={isPending}
        searchPlaceholder="Tìm bộ sưu tập…"
        toolbar={
          <PermissionGate permission={PERMISSIONS.collectionManage}>
            <Button onClick={() => setForm({ open: true })}>
              <PlusIcon className="size-4" />
              Thêm bộ sưu tập
            </Button>
          </PermissionGate>
        }
      />
      <CollectionFormDialog open={form.open} onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))} collection={form.edit} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Xoá bộ sưu tập "${toDelete?.name}"?`}
        description="Bộ sưu tập chỉ là bộ lọc — xoá không ảnh hưởng sản phẩm."
        confirmLabel="Xoá"
        destructive
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </div>
  );
}
