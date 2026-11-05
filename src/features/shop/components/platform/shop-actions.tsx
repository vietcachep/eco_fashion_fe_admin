"use client";

import { BanIcon, CheckIcon, LockOpenIcon, PercentIcon, XIcon, type LucideIcon } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PERMISSIONS } from "@/lib/constants";
import { usePermission } from "@/hooks/use-permission";
import { ReasonDialog } from "@/features/shop/components/platform/reason-dialog";
import { ShopCommissionDialog } from "@/features/shop/components/platform/shop-commission-dialog";
import { useApproveShop, useRejectShop, useShopOpenOrders, useSuspendShop } from "@/features/shop/hooks/use-admin-shops";
import { SHOP_REASON_RULE } from "@/features/shop/schemas/reason-schema";
import type { ShopOpenOrdersSummaryResponse } from "@/lib/api/generated/model";
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

  if (kind === "suspend") return <SuspendShopDialog shop={shop} onClose={onClose} />;

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

/*
 * PLAN-0040 6.4 — hộp thoại KHOÁ shop kèm số đơn đang mở (GET /admin/shops/{id}/open-orders-summary) để quản lý biết hệ quả TRƯỚC khi khoá:
 * đơn chờ xác nhận / đã xác nhận sẽ TỰ HUỶ + hoàn tiền (worker nghe SHOP_SUSPENDED); đơn đang đóng gói / đang giao giữ nguyên, CSKH nhận một
 * thông báo để huỷ tay từng đơn. Con số chỉ là thông tin: đang tải / tải lỗi (vd thiếu supplier.shop.read) vẫn KHOÁ được — không chặn thao tác.
 * Tách thành component con để chỉ gọi API khi người dùng thật sự mở hộp thoại khoá.
 */
const SUSPEND_BASE = "Shop ngừng bán ngay lập tức; sản phẩm đang có bị ẩn khỏi web bán hàng. Có thể mở khoá lại sau.";

function openOrdersNote(s: ShopOpenOrdersSummaryResponse): string {
  const auto = s.pending + s.confirmed;
  const manual = s.packing + s.shipping;
  if (auto + manual === 0) return "Shop hiện không có đơn đang mở.";
  const parts: string[] = [];
  if (auto > 0) parts.push(`${auto} đơn chờ xác nhận / đã xác nhận (${s.pending} + ${s.confirmed}) sẽ TỰ HUỶ và hoàn tiền cho khách`);
  if (manual > 0) parts.push(`${manual} đơn đang đóng gói / đang giao (${s.packing} + ${s.shipping}) giữ nguyên, CSKH sẽ nhận thông báo để huỷ tay từng đơn`);
  return `Đơn đang mở của shop: ${parts.join("; ")}.`;
}

function SuspendShopDialog({ shop, onClose }: { shop: ShopActionTarget; onClose: () => void }) {
  const suspend = useSuspendShop();
  const openOrders = useShopOpenOrders(shop.id);
  const note = openOrders.data
    ? openOrdersNote(openOrders.data)
    : openOrders.isError
      ? "Không tải được số đơn đang mở của shop — vẫn có thể khoá."
      : "Đang kiểm tra các đơn đang mở của shop…";

  return (
    <ReasonDialog
      title={`Khoá gian hàng ${shop.name}?`}
      description={`${SUSPEND_BASE} ${note}`}
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
