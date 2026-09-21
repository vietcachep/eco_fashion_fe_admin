"use client";

import { useMemo, useState } from "react";
import { ChevronRightIcon, ImageIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { PERMISSIONS } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePermission } from "@/hooks/use-permission";
import {
  useAdminCategories,
  useRemoveCategory,
  useUploadCategoryImage,
} from "@/features/catalog/hooks/use-categories";
import { CategoryFormDialog } from "@/features/catalog/components/categories/category-form-dialog";
import type { CategoryAdminResponse } from "@/lib/api/generated/model";

const LOAD_ERROR = "Không tải được ngành hàng.";

export interface CategoryNode extends CategoryAdminResponse {
  children: CategoryNode[];
}

/* Dựng cây từ danh sách phẳng (parentId), sắp theo sortOrder rồi tên. */
export function buildTree(list: CategoryAdminResponse[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  for (const c of list) byId.set(c.id, { ...c, children: [] });
  const roots: CategoryNode[] = [];
  for (const n of byId.values()) {
    const parent = n.parentId ? byId.get(n.parentId) : undefined;
    if (parent) parent.children.push(n);
    else roots.push(n);
  }
  const sort = (arr: CategoryNode[]) => {
    arr.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "vi"));
    arr.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

/*
 * Ngành hàng dạng cây: mỗi hàng có ảnh, tên, slug, số sản phẩm, trạng thái và
 * nút Sửa / Thêm con / Xoá (khoá theo catalog.category.manage). Ảnh đổi ngay
 * khi chọn file (PUT /image). Xoá hỏi xác nhận.
 */
export function CategoriesScreen() {
  const { data, isPending, error } = useAdminCategories();
  const canManage = usePermission(PERMISSIONS.categoryManage);
  const remove = useRemoveCategory();
  const upload = useUploadCategoryImage();
  const [form, setForm] = useState<{ open: boolean; edit?: CategoryAdminResponse; parentId?: string }>({ open: false });
  const [toDelete, setToDelete] = useState<CategoryAdminResponse | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildTree(data ?? []), [data]);

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const pickImage = (c: CategoryAdminResponse) => {
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

  const renderNode = (n: CategoryNode, depth: number) => {
    const open = !collapsed.has(n.id);
    return (
      <div key={n.id}>
        <div
          className={cn("flex items-center gap-3 border-b px-3 py-2 last:border-0", !n.isActive && "opacity-60")}
          style={{ paddingLeft: 12 + depth * 24 }}
        >
          <button
            type="button"
            aria-label={open ? "Thu gọn" : "Mở"}
            onClick={() => toggle(n.id)}
            className={cn("flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted", n.children.length === 0 && "invisible")}
          >
            <ChevronRightIcon className={cn("size-4 transition-transform", open && "rotate-90")} />
          </button>
          <button
            type="button"
            disabled={!canManage}
            onClick={() => pickImage(n)}
            title="Đổi ảnh"
            className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40"
          >
            {n.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- ảnh Cloudinary/seed động
              <img src={n.imageUrl} alt="" className="size-full object-cover" />
            ) : (
              <ImageIcon className="size-4 text-muted-foreground/60" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{n.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              /{n.slug} · {formatNumber(n.productCount)} sản phẩm
              {n.description ? ` · ${n.description}` : ""}
            </p>
          </div>
          <StatusBadge tone={n.isActive ? "success" : "neutral"}>{n.isActive ? "Hiện" : "Ẩn"}</StatusBadge>
          <PermissionGate permission={PERMISSIONS.categoryManage}>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon" className="size-8" title="Thêm ngành con" onClick={() => setForm({ open: true, parentId: n.id })}>
                <PlusIcon className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8" title="Sửa" onClick={() => setForm({ open: true, edit: n })}>
                <PencilIcon className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8 text-destructive" title="Xoá" onClick={() => setToDelete(n)}>
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          </PermissionGate>
        </div>
        {open ? n.children.map((c) => renderNode(c, depth + 1)) : null}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <PermissionGate permission={PERMISSIONS.categoryManage}>
          <Button onClick={() => setForm({ open: true })}>
            <PlusIcon className="size-4" />
            Thêm ngành hàng
          </Button>
        </PermissionGate>
      </div>
      <Card className="py-0">
        <CardContent className="p-0">
          {isPending ? (
            <div className="flex flex-col gap-2 p-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : tree.length ? (
            tree.map((n) => renderNode(n, 0))
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">Chưa có ngành hàng.</p>
          )}
        </CardContent>
      </Card>

      <CategoryFormDialog
        open={form.open}
        onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))}
        category={form.edit}
        parentId={form.parentId}
        all={data ?? []}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Xoá ngành hàng "${toDelete?.name}"?`}
        description="Chỉ xoá được khi không còn sản phẩm và ngành con. Sản phẩm trong ngành phải chuyển sang ngành khác trước."
        confirmLabel="Xoá"
        destructive
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </div>
  );
}
