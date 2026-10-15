"use client";

import { BanIcon, CheckIcon, LockOpenIcon, PercentIcon, XIcon, type LucideIcon } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PERMISSIONS } from "@/lib/constants";
import { usePermission } from "@/hooks/use-permission";
import { ReasonDialog } from "@/features/shop/components/platform/reason-dialog";
import { ShopCommissionDialog } from "@/features/shop/components/platform/shop-commission-dialog";
import { useApproveShop, useRejectShop, useSuspendShop } from "@/features/shop/hooks/use-admin-shops";
import { SHOP_REASON_RULE } from "@/features/shop/schemas/reason-schema";
import type { ShopActionTarget } from "@/features/shop/types/admin-shop";

/*
 * Thao tác của sàn trên một gian hàng — dùng chung cho BẢNG danh sách (menu "⋯") và
 * trang chi tiết (nút ở đầu trang) để hai nơi luôn cùng luật:
 *   pending   → Duyệt · Từ chối (lý do ≥ 3 ký tự)
 *   approved  → Khoá (lý do ≥ 3 ký tự)
 *   suspended → Mở khoá (cùng endpoint `approve`)
 *   rejected  → không có chuyển trạng thái (backend không cho)
 * Sửa hoa hồng cho mọi shop chưa bị từ chối. Mỗi thao tác gác bằng mã quyền riêng
 * (lớp 2 — ẩn nút); backend vẫn là lớp chặn thật.
 */
export type ShopActionKind = "approve" | "unlock" | "suspend" | "reject" | "commission";

export interface ShopAction {
  kind: ShopActionKind;
  shop: ShopActionTarget;
}

export interface ShopActionItem {
  kind: ShopActionKind;
  label: string;
  icon: LucideIcon;
  /** Thao tác làm hại (khoá / từ chối) → nút/mục tô đỏ. */
  destructive?: boolean;
  /** Thao tác chính của trạng thái hiện tại (hiện nút đặc ở trang chi tiết). */
  primary?: boolean;
}

/* Danh sách thao tác mà người đang đăng nhập được làm trên shop này. */
export function useShopActionItems(shop: ShopActionTarget): ShopActionItem[] {
  const canApprove = usePermission(PERMISSIONS.supplierShopApprove);
  const canReject = usePermission(PERMISSIONS.supplierShopReject);
  const canSuspend = usePermission(PERMISSIONS.supplierShopSuspend);
  const canCommission = usePermission(PERMISSIONS.supplierShopCommission);

  const items: ShopActionItem[] = [];
  if (shop.status === "pending") {
    if (canApprove) items.push({ kind: "approve", label: "Duyệt", icon: CheckIcon, primary: true });
    if (canReject) items.push({ kind: "reject", label: "Từ chối", icon: XIcon, destructive: true });
  }
  if (shop.status === "approved" && canSuspend) items.push({ kind: "suspend", label: "Khoá gian hàng", icon: BanIcon, destructive: true });
  if (shop.status === "suspended" && canApprove) items.push({ kind: "unlock", label: "Mở khoá", icon: LockOpenIcon, primary: true });
  if (shop.status !== "rejected" && canCommission) items.push({ kind: "commission", label: "Sửa hoa hồng", icon: PercentIcon });
  return items;
}

/* Mount đúng hộp thoại của thao tác đang chọn; `action = null` thì không render gì. */
export function ShopActionDialogs({ action, onClose }: { action: ShopAction | null; onClose: () => void }) {
  const approve = useApproveShop();
  const suspend = useSuspendShop();
  const reject = useRejectShop();
  if (!action) return null;
  const { kind, shop } = action;

  if (kind === "approve" || kind === "unlock") {
    const unlock = kind === "unlock";
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => !open && onClose()}
        title={unlock ? `Mở khoá gian hàng ${shop.name}?` : `Duyệt gian hàng ${shop.name}?`}
        description={
          unlock
            ? "Shop được bán trở lại, sản phẩm hiện lại trên web bán hàng."
            : "Shop được bán hàng ngay; nếu do người bán tự đăng ký thì người đăng ký trở thành chủ gian hàng. Doanh thu (online và COD) được sàn đối soát và chi theo tài khoản ngân hàng của shop."
        }
        confirmLabel={unlock ? "Mở khoá" : "Duyệt"}
        onConfirm={() => approve.mutate({ id: shop.id, unlock })}
      />
    );
  }

  if (kind === "suspend") {
    return (
      <ReasonDialog
        title={`Khoá gian hàng ${shop.name}?`}
        description="Shop ngừng bán ngay lập tức; sản phẩm đang có bị ẩn khỏi web bán hàng. Có thể mở khoá lại sau."
        label="Lý do khoá"
        placeholder="Bán hàng giả, khách phản ánh nhiều lần…"
        confirmLabel="Khoá"
        destructive
        rule={SHOP_REASON_RULE}
        pending={suspend.isPending}
        onSubmit={(reason) => suspend.mutate({ id: shop.id, reason }, { onSuccess: onClose })}
        onClose={onClose}
      />
    );
  }

  if (kind === "reject") {
    return (
      <ReasonDialog
        title={`Từ chối hồ sơ ${shop.name}?`}
        description="Người đăng ký cần nộp lại hồ sơ từ đầu nếu muốn mở gian hàng."
        label="Lý do từ chối"
        placeholder="Hồ sơ pháp lý không hợp lệ…"
        confirmLabel="Từ chối"
        destructive
        rule={SHOP_REASON_RULE}
        pending={reject.isPending}
        onSubmit={(reason) => reject.mutate({ id: shop.id, reason }, { onSuccess: onClose })}
        onClose={onClose}
      />
    );
  }

  return <ShopCommissionDialog shop={shop} onClose={onClose} />;
}
