"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ShopMemberResponse } from "@/lib/api/generated/model";
import { useSetMemberPermissions } from "@/features/shop/hooks/use-shop-members";

/* Quyền chủ shop có thể giao cho nhân viên — khớp SHOP_ASSIGNABLE_PERMISSIONS của backend; nhân sự / hồ sơ / đối soát / ví đặt cọc chỉ chủ shop có. */
const GROUPS: Array<{ title: string; items: Array<{ code: string; label: string }> }> = [
  {
    title: "Sản phẩm",
    items: [
      { code: "shop.product.read", label: "Xem sản phẩm" },
      { code: "shop.product.manage", label: "Thêm / sửa / ẩn / xoá sản phẩm" },
    ],
  },
  {
    title: "Đơn hàng",
    items: [
      { code: "shop.order.read", label: "Xem đơn hàng" },
      { code: "shop.order.update", label: "Xác nhận / đóng gói / giao / huỷ đơn" },
    ],
  },
  {
    title: "Kho",
    items: [
      { code: "shop.inventory.read", label: "Xem tồn kho" },
      { code: "shop.inventory.manage", label: "Nhập kho / điều chỉnh tồn" },
    ],
  },
  {
    title: "Khuyến mãi, đánh giá & khách",
    items: [
      { code: "shop.promotion.read", label: "Xem mã giảm giá" },
      { code: "shop.promotion.manage", label: "Tạo / sửa mã giảm giá" },
      { code: "shop.review.read", label: "Xem đánh giá" },
      { code: "shop.review.reply", label: "Trả lời đánh giá" },
      { code: "shop.contact.read", label: "Xem tin nhắn khách" },
      { code: "shop.contact.reply", label: "Trả lời tin nhắn khách" },
    ],
  },
  {
    title: "Khác",
    items: [
      { code: "shop.profile.read", label: "Xem hồ sơ gian hàng" },
      { code: "shop.report.read", label: "Xem báo cáo doanh thu / đơn / tồn" },
    ],
  },
];

/*
 * Chủ shop TỰ đặt quyền cho từng nhân viên của mình. Sàn không có đường nào chỉnh việc này.
 * `key` theo thành viên nên state khởi tạo từ quyền hiệu lực hiện tại mỗi lần mở.
 */
export function MemberPermissionsDialog({ member, onClose }: { member: ShopMemberResponse | null; onClose: () => void }) {
  return member ? <Inner key={member.id} member={member} onClose={onClose} /> : null;
}

function Inner({ member, onClose }: { member: ShopMemberResponse; onClose: () => void }) {
  const save = useSetMemberPermissions();
  const [picked, setPicked] = useState<Set<string>>(new Set(member.permissionCodes));
  const toggle = (code: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(code)) n.delete(code);
      else n.add(code);
      return n;
    });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Phân quyền — {member.fullName}</DialogTitle>
          <DialogDescription>
            Chọn những việc nhân viên này được làm trong gian hàng của bạn.
            {member.customPermissions ? " Đang dùng quyền riêng bạn đã đặt." : " Đang theo bộ quyền mặc định của vai Nhân viên."} Quản lý nhân sự, hồ sơ, đối soát và ví đặt cọc chỉ chủ shop có.
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
          {GROUPS.map((g) => (
            <fieldset key={g.title} className="flex flex-col gap-1.5">
              <legend className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{g.title}</legend>
              {g.items.map((it) => (
                <label key={it.code} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4" checked={picked.has(it.code)} onChange={() => toggle(it.code)} />
                  {it.label}
                </label>
              ))}
            </fieldset>
          ))}
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" disabled={save.isPending || !member.customPermissions} onClick={() => save.mutate({ id: member.id, permissionCodes: null }, { onSuccess: onClose })}>
            Về mặc định của vai
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button disabled={save.isPending} onClick={() => save.mutate({ id: member.id, permissionCodes: [...picked] }, { onSuccess: onClose })}>
              {save.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Lưu quyền
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
